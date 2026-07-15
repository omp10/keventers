import { describe, expect, it } from 'vitest';

import { registerNotificationEventHandlers } from '../events/handlers.js';

/** A minimal in-process event bus double capturing subscriptions. */
function makeBus() {
  return {
    handlers: new Map(),
    subscribe(name, fn) { this.handlers.set(name, fn); return this; },
    async emit(name, payload) { const fn = this.handlers.get(name); if (fn) await fn(payload); },
  };
}

function makeOrder(over = {}) {
  return {
    id: 'order-1', _id: 'order-1',
    organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1',
    orderNumber: 'KEV-DIN-1', sessionId: 'sess-1', customerUserId: 'user-1',
    status: 'ready', pricing: { total: { amount: 100000 } },
    ...over,
  };
}

function setup() {
  const bus = makeBus();
  const enqueued = [];
  const outbox = { async enqueueFromEvent(req) { enqueued.push(req); return { id: 'ob-1' }; } };
  const orders = { async getByIdSystem() { return makeOrder(); } };
  registerNotificationEventHandlers(bus, { outbox, orders });
  return { bus, enqueued };
}

describe('Notification event consumers → outbox', () => {
  it('subscribes to every consumed event', () => {
    const { bus } = setup();
    for (const e of ['order.ready', 'payment.captured', 'payment.refund_completed', 'customer.tier.changed', 'restaurant.activated']) {
      expect(bus.handlers.has(e)).toBe(true);
    }
  });

  it('order.ready → an outbox request with the order template + recipient + dedupe', async () => {
    const { bus, enqueued } = setup();
    await bus.emit('order.ready', { orderId: 'order-1' });
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]).toMatchObject({ eventName: 'order.ready', templateKey: 'order_ready', category: 'order_updates' });
    expect(enqueued[0].recipient.userId).toBe('user-1');
    expect(enqueued[0].variables.orderNumber).toBe('KEV-DIN-1');
    expect(enqueued[0].dedupeKey).toBeTruthy();
  });

  it('payment.captured → converts minor units to a major-unit amount variable', async () => {
    const { bus, enqueued } = setup();
    await bus.emit('payment.captured', { orderId: 'order-1', paymentId: 'pay-1', amount: 100000 });
    expect(enqueued[0].variables.amount).toBe(1000); // ₹1000.00
    expect(enqueued[0].dedupeKey).toBeTruthy();
  });

  it('tier.changed → loyalty template with the new tier variable', async () => {
    const { bus, enqueued } = setup();
    await bus.emit('customer.tier.changed', { customerId: 'c1', organizationId: 'org1', restaurantId: 'rest1', toTier: 'gold', userId: 'user-1' });
    expect(enqueued[0]).toMatchObject({ templateKey: 'tier_upgraded', category: 'loyalty' });
    expect(enqueued[0].variables.tier).toBe('gold');
  });

  it('a handler failure never throws back into the publisher', async () => {
    const bus = makeBus();
    const outbox = { async enqueueFromEvent() { throw new Error('db down'); } };
    const orders = { async getByIdSystem() { return makeOrder(); } };
    registerNotificationEventHandlers(bus, { outbox, orders });
    await expect(bus.emit('order.ready', { orderId: 'order-1' })).resolves.toBeUndefined();
  });

  it('skips when the order cannot be resolved (no notification)', async () => {
    const bus = makeBus();
    const enqueued = [];
    registerNotificationEventHandlers(bus, { outbox: { async enqueueFromEvent(r) { enqueued.push(r); } }, orders: { async getByIdSystem() { return null; } } });
    await bus.emit('order.ready', { orderId: 'missing' });
    expect(enqueued).toHaveLength(0);
  });
});
