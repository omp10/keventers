import { createHash, createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { RazorpayProvider } from '../providers/razorpay.provider.js';
import { PhonePeProvider } from '../providers/phonepe.provider.js';
import { providerFactory } from '../providers/provider.factory.js';

const RZP_CREDS = { merchantId: 'rzp_test_key', secretKey: 'rzp_secret', webhookSecret: 'whsec' };
const PP_CREDS = { merchantId: 'PGTESTPAYUAT', secretKey: 'salt-key-xyz', environment: 'test', extra: { saltIndex: '1' } };

describe('RazorpayProvider — payment signature verification', () => {
  const provider = new RazorpayProvider({ credentials: RZP_CREDS });

  it('accepts a correctly-signed handshake', () => {
    const orderId = 'order_ABC';
    const paymentId = 'pay_XYZ';
    const signature = createHmac('sha256', RZP_CREDS.secretKey).update(`${orderId}|${paymentId}`).digest('hex');
    const verdict = provider.verifyPayment({ payload: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } });
    expect(verdict.valid).toBe(true);
    expect(verdict.providerPaymentRef).toBe(paymentId);
  });

  it('rejects a tampered signature', () => {
    const verdict = provider.verifyPayment({ payload: { razorpay_order_id: 'order_ABC', razorpay_payment_id: 'pay_XYZ', razorpay_signature: 'deadbeef' } });
    expect(verdict.valid).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(provider.verifyPayment({ payload: {} }).valid).toBe(false);
  });
});

describe('RazorpayProvider — webhook signature verification', () => {
  const provider = new RazorpayProvider({ credentials: RZP_CREDS });
  const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', status: 'captured', amount: 100000 } } } });

  it('accepts a valid X-Razorpay-Signature over the raw body', () => {
    const sig = createHmac('sha256', RZP_CREDS.webhookSecret).update(rawBody).digest('hex');
    expect(provider.verifyWebhook({ rawBody, headers: { 'x-razorpay-signature': sig } }).valid).toBe(true);
  });

  it('rejects a wrong signature', () => {
    expect(provider.verifyWebhook({ rawBody, headers: { 'x-razorpay-signature': 'nope' } }).valid).toBe(false);
  });

  it('parses to the provider-independent shape (captured)', () => {
    const parsed = provider.parseWebhook({ rawBody, headers: { 'x-razorpay-event-id': 'evt_1' } });
    expect(parsed).toMatchObject({ eventId: 'evt_1', status: 'captured', providerPaymentRef: 'pay_1', providerIntentRef: 'order_1', amount: 100000 });
  });
});

describe('PhonePeProvider — checksum (X-VERIFY) verification', () => {
  const provider = new PhonePeProvider({ credentials: PP_CREDS });

  it('computes checksum as SHA256(base64 + endpoint + salt)###index', () => {
    const base64 = Buffer.from(JSON.stringify({ a: 1 })).toString('base64');
    const endpoint = '/pg/v1/pay';
    const expected = `${createHash('sha256').update(`${base64}${endpoint}${PP_CREDS.secretKey}`).digest('hex')}###1`;
    expect(provider.checksum(base64, endpoint)).toBe(expected);
  });

  it('verifies a valid callback checksum and normalizes COMPLETED → captured', () => {
    const response = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS', data: { merchantTransactionId: 'mtx_1', state: 'COMPLETED' } })).toString('base64');
    const hash = createHash('sha256').update(`${response}${PP_CREDS.secretKey}`).digest('hex');
    const verdict = provider.verifyPayment({ payload: { response }, headers: { 'x-verify': `${hash}###1` } });
    expect(verdict.valid).toBe(true);
    expect(verdict.status).toBe('captured');
    expect(verdict.providerPaymentRef).toBe('mtx_1');
  });

  it('rejects a mismatched checksum', () => {
    const response = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS' })).toString('base64');
    expect(provider.verifyPayment({ payload: { response }, headers: { 'x-verify': 'bad###1' } }).valid).toBe(false);
  });

  it('verifies a webhook checksum over the raw body', () => {
    const rawBody = JSON.stringify({ response: Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS', data: { merchantTransactionId: 'mtx_1', state: 'COMPLETED', amount: 100000 } })).toString('base64') });
    const hash = createHash('sha256').update(`${rawBody}${PP_CREDS.secretKey}`).digest('hex');
    expect(provider.verifyWebhook({ rawBody, headers: { 'x-verify': `${hash}###1` } }).valid).toBe(true);
  });

  it('parses a webhook to the provider-independent shape', () => {
    const inner = { code: 'PAYMENT_SUCCESS', data: { merchantTransactionId: 'mtx_1', state: 'COMPLETED', amount: 100000, transactionId: 'T1' } };
    const rawBody = JSON.stringify({ response: Buffer.from(JSON.stringify(inner)).toString('base64') });
    const parsed = provider.parseWebhook({ rawBody });
    expect(parsed).toMatchObject({ status: 'captured', providerPaymentRef: 'mtx_1', providerIntentRef: 'mtx_1', amount: 100000 });
  });
});

describe('ProviderFactory — registry / extensibility', () => {
  it('creates the built-in providers without leaking the concrete type', () => {
    const rzp = providerFactory.create('razorpay', RZP_CREDS);
    expect(typeof rzp.verifyPayment).toBe('function');
    expect(typeof rzp.verifyWebhook).toBe('function');
    expect(providerFactory.isSupported('razorpay')).toBe(true);
    expect(providerFactory.isSupported('phonepe')).toBe(true);
  });

  it('rejects an unknown provider', () => {
    expect(() => providerFactory.create('unknown', {})).toThrow();
  });

  it('accepts a future provider via register() with no service change', () => {
    class StripeStub extends RazorpayProvider {}
    const f = new (providerFactory.constructor)();
    f.register('stripe', StripeStub);
    expect(f.isSupported('stripe')).toBe(true);
    expect(f.create('stripe', RZP_CREDS)).toBeInstanceOf(StripeStub);
  });
});
