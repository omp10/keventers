import { describe, expect, it } from 'vitest';

import * as salesOrder from '../projections/sales-order.updater.js';
import * as payment from '../projections/payment.updater.js';
import * as kitchen from '../projections/kitchen.updater.js';
import * as notification from '../projections/notification.updater.js';
import { DOMAIN, ENTITY_TYPE, METRIC } from '../constants/analytics.constants.js';

function makeOrder(over = {}) {
  return {
    id: 'o1', organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1',
    status: 'completed',
    createdAt: '2026-07-15T09:00:00Z',
    completedAt: '2026-07-15T09:20:00Z',
    pricing: { subtotal: { amount: 90000 }, tax: { amount: 5000 }, discount: { amount: 10000 }, total: { amount: 85000 } },
    items: [
      { productId: 'burger', product: { name: 'Burger', categoryId: 'food' }, quantity: 2, pricing: { lineTotal: { amount: 60000 } }, modifiers: [{ modifierId: 'cheese', name: 'Cheese' }], addons: [{ addonId: 'fries', name: 'Fries' }] },
    ],
    ...over,
  };
}

const find = (arr, pred) => arr.find(pred);

describe('sales-order updater', () => {
  it('order.completed → sales revenue from the pricing snapshot (never recomputed)', () => {
    const ins = salesOrder.onOrderCompleted(makeOrder(), new Date('2026-07-15T09:20:00Z'));
    const sales = find(ins, (i) => i.kind === 'bucket' && i.domain === DOMAIN.SALES);
    expect(sales.inc[METRIC.GROSS_REVENUE]).toBe(90000);
    expect(sales.inc[METRIC.NET_REVENUE]).toBe(85000);
    expect(sales.inc[METRIC.TAX_TOTAL]).toBe(5000);
    expect(sales.inc[METRIC.DISCOUNT_TOTAL]).toBe(10000);
    expect(sales.inc[METRIC.ITEM_COUNT]).toBe(2);
  });

  it('order.completed → completion time from createdAt→completedAt', () => {
    const ins = salesOrder.onOrderCompleted(makeOrder(), new Date());
    const timing = find(ins, (i) => i.inc?.[METRIC.COMPLETION_TIME_SUM] != null);
    expect(timing.inc[METRIC.COMPLETION_TIME_SUM]).toBe(20 * 60 * 1000); // 20 minutes
    expect(timing.inc[METRIC.COMPLETION_TIME_COUNT]).toBe(1);
  });

  it('order.completed → per-product/category/modifier/addon entity increments', () => {
    const ins = salesOrder.onOrderCompleted(makeOrder(), new Date());
    expect(find(ins, (i) => i.kind === 'entity' && i.entityType === ENTITY_TYPE.PRODUCT).inc[METRIC.UNITS_SOLD]).toBe(2);
    expect(find(ins, (i) => i.entityType === ENTITY_TYPE.CATEGORY)).toBeTruthy();
    expect(find(ins, (i) => i.entityType === ENTITY_TYPE.MODIFIER)).toBeTruthy();
    expect(find(ins, (i) => i.entityType === ENTITY_TYPE.ADDON)).toBeTruthy();
  });

  it('order.placed → placed counter + hourly/weekday histograms', () => {
    const ins = salesOrder.onOrderPlaced(makeOrder(), new Date('2026-07-15T09:00:00Z'));
    expect(ins[0].inc[METRIC.ORDERS_PLACED]).toBe(1);
    expect(ins[0].hist.hourly.idx).toBe(9);
  });
});

describe('payment updater', () => {
  it('captured → bucket + per-provider entity', () => {
    const ins = payment.onPaymentCaptured({ provider: 'razorpay', amount: 85000 });
    expect(ins[0].inc[METRIC.CAPTURED_AMOUNT]).toBe(85000);
    expect(find(ins, (i) => i.kind === 'entity').entityId).toBe('razorpay');
  });
  it('refund → payment refund counters + sales refundTotal', () => {
    const ins = payment.onRefundCompleted({ provider: 'phonepe', amount: 40000 });
    expect(find(ins, (i) => i.domain === DOMAIN.SALES).inc[METRIC.REFUND_TOTAL]).toBe(40000);
  });
});

describe('kitchen updater — no SLA double counting', () => {
  it('ready (not breached) → readyCount + slaMet + prep; NOT slaBreached', () => {
    const ins = kitchen.onKitchenReady({ prepMs: 600000, chefId: 'chef1', stationIds: ['grill'], breached: false });
    expect(ins[0].inc[METRIC.READY_COUNT]).toBe(1);
    expect(ins[0].inc[METRIC.SLA_MET]).toBe(1);
    expect(ins[0].inc[METRIC.SLA_BREACHED]).toBeUndefined();
    expect(ins[0].inc[METRIC.PREP_TIME_SUM]).toBe(600000);
  });
  it('ready (breached) → readyCount only (breach counted by sla.breached)', () => {
    const ins = kitchen.onKitchenReady({ breached: true });
    expect(ins[0].inc[METRIC.SLA_MET]).toBeUndefined();
    expect(ins[0].inc[METRIC.SLA_BREACHED]).toBeUndefined();
  });
  it('sla.breached → the authoritative breach + delayed counters', () => {
    const ins = kitchen.onSlaBreached();
    expect(ins[0].inc[METRIC.SLA_BREACHED]).toBe(1);
    expect(ins[0].inc[METRIC.DELAYED_ORDERS]).toBe(1);
  });
});

describe('notification updater', () => {
  it('maps a lifecycle event to its channel metric', () => {
    const ins = notification.onNotificationEvent('notification.delivered', { channel: 'email' });
    expect(ins[0].inc[METRIC.NTF_DELIVERED]).toBe(1);
    expect(find(ins, (i) => i.kind === 'entity').entityId).toBe('email');
  });
  it('ignores an unmapped event', () => {
    expect(notification.onNotificationEvent('notification.unknown', {})).toEqual([]);
  });
});
