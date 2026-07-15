import { beforeEach, describe, expect, it } from 'vitest';

import { RefundService } from '../services/refund.service.js';
import { PAYMENT_EVENTS } from '../events/payment.events.js';
import { PAYMENT_STATUS, REFUND_STATUS, TRANSACTION_TYPE } from '../constants/payment.constants.js';

import {
  FakePaymentRepo,
  FakeRefundRepo,
  createFakeConfigService,
  createFakeEventBus,
  createFakeTransactionService,
  createStubAdapter,
  fakeRealtime,
  noopLock,
  staffTenant,
} from './_helpers.js';

async function build({ refundOver = {} } = {}) {
  const payments = new FakePaymentRepo();
  const refunds = new FakeRefundRepo();
  const transactions = createFakeTransactionService();
  const adapter = createStubAdapter(refundOver);
  const configs = createFakeConfigService(adapter);
  const events = createFakeEventBus();
  const service = new RefundService({ refunds, payments, transactions, configs, realtime: fakeRealtime, resolveScope: async () => ({ organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' }), lock: noopLock, eventBus: events });
  const payment = await payments.createScoped(
    { organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' },
    { orderId: 'order-1', provider: 'razorpay', providerPaymentRef: 'pay-1', amount: 100000, currency: 'INR', status: PAYMENT_STATUS.CAPTURED, refundedAmount: 0 },
  );
  return { service, payments, refunds, transactions, adapter, events, payment };
}

describe('RefundService — full & partial refunds', () => {
  let ctx;
  beforeEach(async () => { ctx = await build(); });

  it('processes a full refund via the provider, writes the ledger, marks the payment REFUNDED', async () => {
    const dto = await ctx.service.requestRefund(staffTenant(), { paymentId: ctx.payment._id, reason: 'customer request' }, 'staff-1');
    expect(dto.status).toBe(REFUND_STATUS.COMPLETED);
    expect(ctx.adapter.calls.refund[0]).toMatchObject({ providerPaymentRef: 'pay-1', amount: 100000 });
    expect(ctx.transactions.byType(TRANSACTION_TYPE.REFUND)).toHaveLength(1);
    const updated = await ctx.payments.findById(ctx.payment._id);
    expect(updated.status).toBe(PAYMENT_STATUS.REFUNDED);
    expect(updated.refundedAmount).toBe(100000);
    expect(ctx.events.names()).toContain(PAYMENT_EVENTS.REFUND_COMPLETED);
  });

  it('processes a partial refund and marks the payment PARTIALLY_REFUNDED', async () => {
    const dto = await ctx.service.requestRefund(staffTenant(), { paymentId: ctx.payment._id, amount: 30000 }, 'staff-1');
    expect(dto.amount).toBe(30000);
    expect(dto.isPartial).toBe(true);
    const updated = await ctx.payments.findById(ctx.payment._id);
    expect(updated.status).toBe(PAYMENT_STATUS.PARTIALLY_REFUNDED);
    expect(updated.refundedAmount).toBe(30000);
  });
});

describe('RefundService — over-refund prevention', () => {
  it('rejects a refund that would exceed the captured amount', async () => {
    const ctx = await build();
    await expect(ctx.service.requestRefund(staffTenant(), { paymentId: ctx.payment._id, amount: 150000 })).rejects.toMatchObject({ statusCode: 409 });
    expect(ctx.transactions.byType(TRANSACTION_TYPE.REFUND)).toHaveLength(0);
  });

  it('rejects a second refund whose sum would exceed the captured amount', async () => {
    const ctx = await build();
    await ctx.service.requestRefund(staffTenant(), { paymentId: ctx.payment._id, amount: 70000 });
    // 70000 already refunded; a further 50000 (>30000 refundable) must fail.
    await expect(ctx.service.requestRefund(staffTenant(), { paymentId: ctx.payment._id, amount: 50000 })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuses to refund a non-captured payment', async () => {
    const ctx = await build();
    await ctx.payments.updateById(ctx.payment._id, { status: PAYMENT_STATUS.FAILED });
    await expect(ctx.service.requestRefund(staffTenant(), { paymentId: ctx.payment._id })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('RefundService — idempotency', () => {
  it('returns the prior refund for a repeated idempotency key (no double execution)', async () => {
    const ctx = await build();
    const first = await ctx.service.requestRefund(staffTenant(), { paymentId: ctx.payment._id, amount: 20000, idempotencyKey: 'k1' });
    const second = await ctx.service.requestRefund(staffTenant(), { paymentId: ctx.payment._id, amount: 20000, idempotencyKey: 'k1' });
    expect(second.id).toBe(first.id);
    expect(ctx.adapter.calls.refund).toHaveLength(1);
    expect(ctx.transactions.byType(TRANSACTION_TYPE.REFUND)).toHaveLength(1);
  });
});
