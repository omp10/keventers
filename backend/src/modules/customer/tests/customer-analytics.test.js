import { beforeEach, describe, expect, it } from 'vitest';

import { CustomerAnalyticsService } from '../services/customer-analytics.service.js';

import { FakeCustomerRepo } from './_helpers.js';

const CUSTOMER_ID = 'cust-1';

function makeOrder(over = {}) {
  return {
    id: 'order-1', _id: 'order-1',
    organizationId: 'org1', restaurantId: 'rest1',
    customerUserId: 'user-1',
    status: 'completed',
    completedAt: new Date('2026-07-10'),
    pricing: { total: { amount: 100000, currency: 'INR' } },
    payment: { status: 'captured' },
    items: [{ productId: 'burger', product: { name: 'Burger' }, quantity: 2 }],
    ...over,
  };
}

function build() {
  const customers = new FakeCustomerRepo();
  customers._seed({ _id: CUSTOMER_ID, id: CUSTOMER_ID, organizationId: 'org1', restaurantId: 'rest1', userId: 'user-1', stats: {} });
  const loyalty = { earns: [], reverses: [], async earn(ctx) { this.earns.push(ctx); return { created: true }; }, async reverse(ctx) { this.reverses.push(ctx); return { reversed: ctx.points }; } };
  const orders = { list: [], async listForCustomerSystem() { return this.list; } };
  const service = new CustomerAnalyticsService({ customers, loyalty, orders, earnRate: 1, favoritesLimit: 10 });
  return { service, customers, loyalty, orders };
}

describe('CustomerAnalyticsService — event projections', () => {
  let ctx;
  beforeEach(() => { ctx = build(); });

  it('OrderCompleted → increments order/visit counters + favorites + last visit', async () => {
    await ctx.service.onOrderCompleted(makeOrder());
    const c = await ctx.customers.findById(CUSTOMER_ID);
    expect(c.stats.totalOrders).toBe(1);
    expect(c.stats.completedOrders).toBe(1);
    expect(c.stats.visitCount).toBe(1);
    expect(c.stats.lastVisitAt).toBeTruthy();
    expect(c.stats.favoriteProducts[0]).toMatchObject({ name: 'Burger', orderedCount: 2 });
  });

  it('PaymentCaptured → adds lifetime spend and earns loyalty points', async () => {
    await ctx.service.onPaymentCaptured({ order: makeOrder(), amount: 100000, paymentId: 'pay-1' });
    const c = await ctx.customers.findById(CUSTOMER_ID);
    expect(c.stats.lifetimeSpend).toBe(100000);
    expect(ctx.loyalty.earns).toHaveLength(1);
    expect(ctx.loyalty.earns[0].points).toBe(1000); // ₹1000 → 1000 pts
    expect(ctx.loyalty.earns[0].source).toMatchObject({ type: 'payment', id: 'pay-1' });
  });

  it('RefundCompleted → reduces spend (floored) and claws back points', async () => {
    await ctx.service.onPaymentCaptured({ order: makeOrder(), amount: 100000, paymentId: 'pay-1' });
    await ctx.service.onRefundCompleted({ order: makeOrder(), amount: 40000, refundId: 'ref-1' });
    const c = await ctx.customers.findById(CUSTOMER_ID);
    expect(c.stats.lifetimeSpend).toBe(60000);
    expect(c.stats.totalRefunded).toBe(40000);
    expect(ctx.loyalty.reverses[0]).toMatchObject({ points: 400, source: { type: 'refund', id: 'ref-1' } });
  });

  it('no-ops when the order has no linked customer (pure guest)', async () => {
    const res = await ctx.service.onOrderCompleted(makeOrder({ customerUserId: null }));
    expect(res.skipped).toBe(true);
  });

  it('no-ops when the customer record does not exist yet', async () => {
    const res = await ctx.service.onOrderCompleted(makeOrder({ customerUserId: 'user-unknown' }));
    expect(res.skipped).toBe(true);
  });
});

describe('CustomerAnalyticsService — merge rebuild (idempotent SET from history)', () => {
  it('re-projects stats from the authoritative order history', async () => {
    const ctx = build();
    ctx.orders.list = [
      makeOrder({ id: 'o1', status: 'completed', pricing: { total: { amount: 100000 } } }),
      makeOrder({ id: 'o2', status: 'completed', pricing: { total: { amount: 50000 } } }),
      makeOrder({ id: 'o3', status: 'cancelled' }),
    ];
    const customer = await ctx.customers.findById(CUSTOMER_ID);
    const stats = await ctx.service.recomputeForCustomer({ restaurantId: 'rest1' }, customer);
    expect(stats.totalOrders).toBe(3);
    expect(stats.completedOrders).toBe(2);
    expect(stats.cancelledOrders).toBe(1);
    expect(stats.lifetimeSpend).toBe(150000);
    expect(stats.avgOrderValue).toBe(75000);
    // Idempotent: running again yields identical stats (SET, not increment).
    const again = await ctx.service.recomputeForCustomer({ restaurantId: 'rest1' }, customer);
    expect(again).toEqual(stats);
  });
});
