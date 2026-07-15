import { beforeEach, describe, expect, it } from 'vitest';

import { PaymentIntentService } from '../services/payment-intent.service.js';
import { PAYMENT_EVENTS } from '../events/payment.events.js';
import { INTENT_STATUS, PAYMENT_STATUS } from '../constants/payment.constants.js';

import {
  GUEST_SCOPE,
  FakePaymentRepo,
  FakeIntentRepo,
  createFakeConfigService,
  createFakeEventBus,
  createFakeStore,
  createStubAdapter,
  makeOrder,
  noopLock,
} from './_helpers.js';

const PAYMENT_CONFIG = { intentTtlSeconds: 900, idempotencyTtlSeconds: 86400, lockTtlMs: 8000 };

function build({ order = makeOrder() } = {}) {
  const intents = new FakeIntentRepo();
  const payments = new FakePaymentRepo();
  const adapter = createStubAdapter();
  const configs = createFakeConfigService(adapter);
  const store = createFakeStore();
  const events = createFakeEventBus();
  const orders = { async getByIdSystem() { return order; } };
  const service = new PaymentIntentService({ intents, payments, configs, orders, store, lock: noopLock, paymentConfig: PAYMENT_CONFIG, eventBus: events });
  return { service, intents, payments, adapter, store, events, order };
}

describe('PaymentIntentService — createIntent', () => {
  let ctx;
  beforeEach(() => { ctx = build(); });

  it('creates an intent for the full remaining balance from the order Pricing snapshot', async () => {
    const dto = await ctx.service.createIntent(GUEST_SCOPE, { orderId: 'order-1', provider: 'razorpay', method: 'upi' });
    expect(dto.amount).toBe(100000); // never recalculated — read from order.pricing.total
    expect(dto.status).toBe(INTENT_STATUS.PENDING);
    expect(dto.providerIntentRef).toBe('prov-intent-1');
    expect(ctx.adapter.calls.createIntent[0]).toMatchObject({ amount: 100000, orderNumber: 'KEV-DIN-20260715-000001' });
    expect(ctx.events.names()).toContain(PAYMENT_EVENTS.INTENT_CREATED);
  });

  it('supports a partial amount for split payment', async () => {
    const dto = await ctx.service.createIntent(GUEST_SCOPE, { orderId: 'order-1', amount: 40000 });
    expect(dto.amount).toBe(40000);
  });

  it('replays a stored result for a repeated idempotency key', async () => {
    const first = await ctx.service.createIntent(GUEST_SCOPE, { orderId: 'order-1', idempotencyKey: 'k1' });
    const second = await ctx.service.createIntent(GUEST_SCOPE, { orderId: 'order-1', idempotencyKey: 'k1' });
    expect(second).toEqual(first);
    expect(ctx.adapter.calls.createIntent).toHaveLength(1); // gateway hit once
  });

  it('rejects an amount greater than the remaining balance', async () => {
    await expect(ctx.service.createIntent(GUEST_SCOPE, { orderId: 'order-1', amount: 200000 })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a cross-session guest', async () => {
    await expect(ctx.service.createIntent({ ...GUEST_SCOPE, sessionId: 'other' }, { orderId: 'order-1' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuses payment once the order is already fully settled', async () => {
    const ctx2 = build();
    await ctx2.payments.createScoped({ organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' }, { orderId: 'order-1', amount: 100000, status: PAYMENT_STATUS.CAPTURED });
    await expect(ctx2.service.createIntent(GUEST_SCOPE, { orderId: 'order-1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses payment for a cancelled order', async () => {
    const ctx2 = build({ order: makeOrder({ status: 'cancelled' }) });
    await expect(ctx2.service.createIntent(GUEST_SCOPE, { orderId: 'order-1' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('PaymentIntentService — cancelForOrder', () => {
  it('cancels every still-open intent for a cancelled order', async () => {
    const ctx = build();
    await ctx.intents.createScoped({ organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' }, { orderId: 'order-1', status: INTENT_STATUS.PENDING });
    await ctx.intents.createScoped({ organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' }, { orderId: 'order-1', status: INTENT_STATUS.CAPTURED });
    const res = await ctx.service.cancelForOrder('order-1');
    expect(res.cancelled).toBe(1); // only the PENDING one
  });
});
