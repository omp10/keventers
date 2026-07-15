import { beforeEach, describe, expect, it } from 'vitest';

import { WebhookService } from '../services/webhook.service.js';
import { providerFactory } from '../providers/provider.factory.js';

import {
  FakePaymentRepo,
  FakeIntentRepo,
  FakeWebhookRepo,
  createFakeConfigService,
  createFakeStore,
  createStubAdapter,
  makeOrder,
} from './_helpers.js';

const RAW = JSON.stringify({
  event: 'payment.captured',
  payload: { payment: { entity: { id: 'pay-1', order_id: 'order_1', status: 'captured', amount: 100000 } } },
});

async function build({ verifyWebhook } = {}) {
  const webhooks = new FakeWebhookRepo();
  const payments = new FakePaymentRepo();
  const intents = new FakeIntentRepo();
  const order = makeOrder();
  const adapter = createStubAdapter({ verifyWebhook: verifyWebhook ?? (() => ({ valid: true })) });
  const configs = createFakeConfigService(adapter);
  const orders = { async getByIdSystem() { return order; } };
  const processor = { applied: [], async applyWebhookResult(args) { this.applied.push(args); return { id: 'pay-x' }; } };
  const store = createFakeStore();
  // Seed the intent so #resolveTarget maps providerIntentRef → order (webhook-first settle).
  await intents.createScoped({ organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' }, { orderId: 'order-1', providerIntentRef: 'order_1', status: 'pending' });
  const service = new WebhookService({ webhooks, payments, intents, configs, factory: providerFactory, orders, processor, store, paymentConfig: { webhook: { dedupTtlSeconds: 100, replayWindowSeconds: 300 } } });
  return { service, webhooks, processor, store, adapter };
}

describe('WebhookService — verify → dedup → process', () => {
  let ctx;
  beforeEach(async () => { ctx = await build(); });

  it('verifies the signature and applies the result exactly once', async () => {
    const headers = { 'x-razorpay-event-id': 'evt_1', 'x-razorpay-signature': 'sig' };
    const res = await ctx.service.handle('razorpay', { rawBody: RAW, headers });
    expect(res).toMatchObject({ processed: true });
    expect(ctx.processor.applied).toHaveLength(1);
    expect(ctx.processor.applied[0].parsed).toMatchObject({ providerPaymentRef: 'pay-1', status: 'captured' });
  });

  it('rejects an unsupported provider', async () => {
    await expect(ctx.service.handle('bogus', { rawBody: RAW, headers: {} })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('treats an already-processed event as a duplicate (replay protection)', async () => {
    const headers = { 'x-razorpay-event-id': 'evt_1', 'x-razorpay-signature': 'sig' };
    await ctx.service.handle('razorpay', { rawBody: RAW, headers });
    const second = await ctx.service.handle('razorpay', { rawBody: RAW, headers });
    expect(second).toMatchObject({ duplicate: true });
    expect(ctx.processor.applied).toHaveLength(1); // not applied twice
  });

  it('ignores a webhook whose order cannot be resolved', async () => {
    const noTarget = await build();
    // Wipe the intent so neither payment nor intent resolves.
    noTarget.service.intents.docs.clear();
    const res = await noTarget.service.handle('razorpay', { rawBody: RAW, headers: { 'x-razorpay-event-id': 'evt_2', 'x-razorpay-signature': 'sig' } });
    expect(res).toMatchObject({ ignored: true });
    expect(noTarget.processor.applied).toHaveLength(0);
  });
});

describe('WebhookService — signature enforcement', () => {
  it('throws 403 and does not apply the result on an invalid signature', async () => {
    const ctx = await build({ verifyWebhook: () => ({ valid: false }) });
    await expect(ctx.service.handle('razorpay', { rawBody: RAW, headers: { 'x-razorpay-event-id': 'evt_9', 'x-razorpay-signature': 'bad' } })).rejects.toMatchObject({ statusCode: 403 });
    expect(ctx.processor.applied).toHaveLength(0);
  });
});
