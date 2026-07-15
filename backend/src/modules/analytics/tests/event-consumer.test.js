import { describe, expect, it } from 'vitest';

import { registerAnalyticsEventHandlers } from '../events/handlers.js';
import { DOMAIN } from '../constants/analytics.constants.js';

function makeBus() {
  return {
    handlers: new Map(),
    subscribe(name, fn) { this.handlers.set(name, fn); return this; },
    async emit(name, payload) { const fn = this.handlers.get(name); if (fn) await fn(payload); },
  };
}

function makeOrder(over = {}) {
  return { id: 'o1', organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1', status: 'completed', createdAt: '2026-07-15T09:00:00Z', completedAt: '2026-07-15T09:10:00Z', pricing: { subtotal: { amount: 90000 }, tax: { amount: 5000 }, discount: { amount: 0 }, total: { amount: 95000 } }, items: [{ productId: 'p1', product: { name: 'X' }, quantity: 1 }], ...over };
}

function setup() {
  const bus = makeBus();
  const applied = [];
  const projections = { async apply(scope, instructions, at) { applied.push({ scope, instructions, at }); } };
  const orders = { async getByIdSystem() { return makeOrder(); } };
  const kitchen = { async getByOrderIdSystem() { return { organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1', assignment: { currentChefId: 'chef1' }, stationIds: ['grill'], sla: { breached: false } }; } };
  const scopeResolver = { async fromRestaurant(id) { return id ? { organizationId: 'org1', restaurantId: String(id) } : null; }, async fromBranch(id) { return id ? { organizationId: 'org1', restaurantId: 'rest1', branchId: String(id) } : null; } };
  const store = { async recordPreparing() {}, async takePreparing() { return Date.now() - 600000; }, async recordSessionStart() {}, async takeSessionStart() { return Date.now() - 300000; } };
  registerAnalyticsEventHandlers(bus, { orders, kitchen, projections, scopeResolver, store });
  return { bus, applied };
}

describe('Analytics event consumers → projections', () => {
  it('subscribes to the full consumed event set', () => {
    const { bus } = setup();
    for (const e of ['order.placed', 'order.completed', 'payment.captured', 'kitchen.order.ready', 'kitchen.sla.breached', 'customer.created', 'notification.delivered', 'qr.scanned', 'session.created']) {
      expect(bus.handlers.has(e)).toBe(true);
    }
  });

  it('order.completed → applies sales/orders/products instructions with the order scope', async () => {
    const { bus, applied } = setup();
    await bus.emit('order.completed', { orderId: 'o1' });
    expect(applied).toHaveLength(1);
    expect(applied[0].scope).toMatchObject({ organizationId: 'org1', restaurantId: 'rest1' });
    const domains = new Set(applied[0].instructions.map((i) => i.domain));
    expect(domains.has(DOMAIN.SALES)).toBe(true);
    expect(domains.has(DOMAIN.PRODUCTS)).toBe(true);
  });

  it('payment.captured → resolves org from restaurantId then applies', async () => {
    const { bus, applied } = setup();
    await bus.emit('payment.captured', { restaurantId: 'rest1', branchId: 'br1', provider: 'razorpay', amount: 95000 });
    expect(applied[0].scope.organizationId).toBe('org1');
    expect(applied[0].instructions.some((i) => i.domain === DOMAIN.PAYMENTS)).toBe(true);
  });

  it('kitchen.order.ready → enriches chef/station + correlated prep time', async () => {
    const { bus, applied } = setup();
    await bus.emit('kitchen.order.ready', { orderId: 'o1', restaurantId: 'rest1' });
    const inst = applied[0].instructions;
    expect(inst.some((i) => i.entityType === 'chef')).toBe(true);
    expect(inst.some((i) => i.entityType === 'station')).toBe(true);
  });

  it('a handler failure never throws back into the publisher', async () => {
    const bus = makeBus();
    registerAnalyticsEventHandlers(bus, { orders: { async getByIdSystem() { throw new Error('down'); } }, projections: { async apply() {} }, scopeResolver: {}, store: {} });
    await expect(bus.emit('order.completed', { orderId: 'o1' })).resolves.toBeUndefined();
  });

  it('skips when scope cannot be resolved', async () => {
    const bus = makeBus();
    const applied = [];
    registerAnalyticsEventHandlers(bus, { orders: {}, projections: { async apply(...a) { applied.push(a); } }, scopeResolver: { async fromRestaurant() { return null; } }, store: {} });
    await bus.emit('payment.captured', { restaurantId: 'x', provider: 'razorpay', amount: 1 });
    expect(applied).toHaveLength(0);
  });
});
