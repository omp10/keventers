import { beforeEach, describe, expect, it } from 'vitest';

import { PaymentService } from '../services/payment.service.js';
import { PAYMENT_EVENTS } from '../events/payment.events.js';
import { PAYMENT_STATUS, TRANSACTION_TYPE } from '../constants/payment.constants.js';

import {
  GUEST_SCOPE,
  FakePaymentRepo,
  FakeIntentRepo,
  createFakeConfigService,
  createFakeEventBus,
  createFakeTransactionService,
  createStubAdapter,
  fakeRealtime,
  makeOrder,
  noopLock,
  staffTenant,
} from './_helpers.js';

function build({ adapterOver = {}, order = makeOrder() } = {}) {
  const payments = new FakePaymentRepo();
  const intents = new FakeIntentRepo();
  const transactions = createFakeTransactionService();
  const adapter = createStubAdapter(adapterOver);
  const configs = createFakeConfigService(adapter);
  const events = createFakeEventBus();
  const invoices = { generated: [], async generateForOrder(o) { this.generated.push(o); return { id: 'inv-1' }; } };
  const orders = {
    statuses: [],
    async getByIdSystem() { return order; },
    async recordPaymentStatus(id, status) { this.statuses.push(status); return { id, paymentStatus: status }; },
  };
  const service = new PaymentService({ payments, intents, transactions, configs, invoices, orders, realtime: fakeRealtime, resolveScope: async () => ({ organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' }), lock: noopLock, eventBus: events });
  return { service, payments, intents, transactions, adapter, events, invoices, orders, order };
}

describe('PaymentService — confirm (customer handshake)', () => {
  let ctx;
  let intent;
  beforeEach(async () => {
    ctx = build();
    intent = await ctx.intents.createScoped(GUEST_SCOPE, { orderId: 'order-1', sessionId: 'sess-1', provider: 'razorpay', method: 'upi', amount: 100000, currency: 'INR', status: 'pending' });
  });

  it('captures a verified payment, writes the immutable ledger, syncs the order + invoice', async () => {
    const dto = await ctx.service.confirm(GUEST_SCOPE, { intentId: intent._id, providerPayload: {}, headers: {} });
    expect(dto.status).toBe(PAYMENT_STATUS.CAPTURED);
    // Ledger: an AUTHORIZATION + a CAPTURE transaction (never edited).
    expect(ctx.transactions.byType(TRANSACTION_TYPE.AUTHORIZATION)).toHaveLength(1);
    expect(ctx.transactions.byType(TRANSACTION_TYPE.CAPTURE)).toHaveLength(1);
    // Order fully paid → status CAPTURED + invoice generated.
    expect(ctx.orders.statuses).toContain(PAYMENT_STATUS.CAPTURED);
    expect(ctx.invoices.generated).toHaveLength(1);
    // Provider-independent events only.
    expect(ctx.events.names()).toContain(PAYMENT_EVENTS.PAYMENT_AUTHORIZED);
    expect(ctx.events.names()).toContain(PAYMENT_EVENTS.PAYMENT_CAPTURED);
  });

  it('is idempotent by provider payment ref (a replay returns the same payment, no double ledger)', async () => {
    const first = await ctx.service.confirm(GUEST_SCOPE, { intentId: intent._id });
    const second = await ctx.service.confirm(GUEST_SCOPE, { intentId: intent._id });
    expect(second.id).toBe(first.id);
    expect(ctx.payments.docs.size).toBe(1);
    expect(ctx.transactions.byType(TRANSACTION_TYPE.CAPTURE)).toHaveLength(1);
  });

  it('records a failure and throws when the signature is invalid', async () => {
    const bad = build({ adapterOver: { verifyPayment: () => ({ valid: false, reason: 'signature_invalid' }) } });
    const i = await bad.intents.createScoped(GUEST_SCOPE, { orderId: 'order-1', sessionId: 'sess-1', provider: 'razorpay', amount: 100000, status: 'pending' });
    await expect(bad.service.confirm(GUEST_SCOPE, { intentId: i._id })).rejects.toMatchObject({ statusCode: 403 });
    expect(bad.transactions.byType(TRANSACTION_TYPE.FAILURE)).toHaveLength(1);
    expect(bad.events.names()).toContain(PAYMENT_EVENTS.PAYMENT_FAILED);
  });

  it('rejects a cross-session intent', async () => {
    await expect(ctx.service.confirm({ ...GUEST_SCOPE, sessionId: 'other' }, { intentId: intent._id })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('records only AUTHORIZATION (no capture) when the gateway leaves it authorized', async () => {
    const authOnly = build({ adapterOver: { capture: { captured: false } } });
    const i = await authOnly.intents.createScoped(GUEST_SCOPE, { orderId: 'order-1', sessionId: 'sess-1', provider: 'razorpay', amount: 100000, status: 'pending' });
    const dto = await authOnly.service.confirm(GUEST_SCOPE, { intentId: i._id });
    expect(dto.status).toBe(PAYMENT_STATUS.AUTHORIZED);
    expect(authOnly.transactions.byType(TRANSACTION_TYPE.CAPTURE)).toHaveLength(0);
    expect(authOnly.invoices.generated).toHaveLength(0);
  });
});

describe('PaymentService — multi-payment (split tender)', () => {
  it('marks the order captured only once the cumulative settled amount covers the total', async () => {
    const ctx = build({ order: makeOrder({ pricing: { total: { amount: 100000, currency: 'INR' } } }) });
    // First tender: ₹600 via gateway.
    const i1 = await ctx.intents.createScoped(GUEST_SCOPE, { orderId: 'order-1', sessionId: 'sess-1', provider: 'razorpay', amount: 60000, status: 'pending' });
    ctx.adapter.verifyPayment = () => ({ valid: true, providerPaymentRef: 'pay-A', status: 'captured' });
    await ctx.service.confirm(GUEST_SCOPE, { intentId: i1._id });
    expect(ctx.orders.statuses.at(-1)).toBe(PAYMENT_STATUS.AUTHORIZED); // not yet fully paid
    // Second tender: ₹400 cash at the counter → now fully paid.
    await ctx.service.recordManualPayment(staffTenant(), { orderId: 'order-1', amount: 40000, method: 'cash' }, 'staff-1');
    expect(ctx.orders.statuses.at(-1)).toBe(PAYMENT_STATUS.CAPTURED);
    expect(ctx.payments.docs.size).toBe(2);
  });

  it('refuses a manual amount that exceeds the remaining balance', async () => {
    const ctx = build();
    await expect(ctx.service.recordManualPayment(staffTenant(), { orderId: 'order-1', amount: 200000, method: 'cash' })).rejects.toMatchObject({ statusCode: 400 });
  });
});
