import { createHmac, timingSafeEqual } from 'node:crypto';

import { PAYMENT_METHOD, PROVIDER } from '../constants/payment.constants.js';

import { PaymentProvider } from './payment-provider.interface.js';

const BASE_URL = 'https://api.razorpay.com/v1';

/** Constant-time hex-string comparison. */
function safeEqualHex(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Razorpay adapter. Implements the common PaymentProvider interface. The
 * security-critical operations (checkout + webhook HMAC-SHA256 signature
 * verification) are pure crypto and fully exercised by tests; the gateway calls
 * (order create, capture, refund) go through the injected HTTP client so they
 * run for real in production and are mocked in tests. Test vs live is selected
 * purely by the merchant keys (Razorpay uses the same base URL for both).
 */
export class RazorpayProvider extends PaymentProvider {
  constructor(deps = {}) {
    super(PROVIDER.RAZORPAY, deps);
  }

  supportedMethods() {
    return [
      PAYMENT_METHOD.UPI,
      PAYMENT_METHOD.CREDIT_CARD,
      PAYMENT_METHOD.DEBIT_CARD,
      PAYMENT_METHOD.NET_BANKING,
      PAYMENT_METHOD.WALLET,
    ];
  }

  #authHeader() {
    const { merchantId, secretKey } = this.credentials;
    const token = Buffer.from(`${merchantId}:${secretKey}`).toString('base64');
    return { authorization: `Basic ${token}` };
  }

  /** Create a Razorpay Order (the "intent"). */
  async createPaymentIntent({ amount, currency = 'INR', orderNumber, notes = {} }) {
    const res = await this.http.post(`${BASE_URL}/orders`, {
      headers: this.#authHeader(),
      body: { amount, currency, receipt: orderNumber, notes },
    });
    if (!res.ok) throw new Error(`Razorpay order create failed (${res.status})`);
    return {
      providerIntentRef: res.data.id,
      checkoutPayload: this.generateCheckoutPayload({ providerIntentRef: res.data.id, amount, currency }),
      raw: res.data,
    };
  }

  generateCheckoutPayload({ providerIntentRef, amount, currency = 'INR' }) {
    // Non-secret: the key id is publishable; the secret is never included.
    return { provider: PROVIDER.RAZORPAY, key: this.credentials.merchantId, order_id: providerIntentRef, amount, currency };
  }

  /**
   * Verify the client-returned handshake:
   *   HMAC_SHA256(order_id + '|' + payment_id, keySecret) === signature
   */
  verifyPayment({ payload = {} }) {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = payload;
    if (!orderId || !paymentId || !signature) return { valid: false, reason: 'missing_fields' };
    const expected = createHmac('sha256', this.credentials.secretKey).update(`${orderId}|${paymentId}`).digest('hex');
    return { valid: safeEqualHex(expected, signature), providerPaymentRef: paymentId, status: 'authorized' };
  }

  async fetchPayment({ providerPaymentRef }) {
    const res = await this.http.get(`${BASE_URL}/payments/${providerPaymentRef}`, { headers: this.#authHeader() });
    if (!res.ok) throw new Error(`Razorpay fetch failed (${res.status})`);
    return { status: res.data.status, amount: res.data.amount, method: res.data.method, raw: res.data };
  }

  async capturePayment({ providerPaymentRef, amount, currency = 'INR' }) {
    const res = await this.http.post(`${BASE_URL}/payments/${providerPaymentRef}/capture`, {
      headers: this.#authHeader(),
      body: { amount, currency },
    });
    if (!res.ok) throw new Error(`Razorpay capture failed (${res.status})`);
    return { captured: res.data.status === 'captured', providerTxnRef: res.data.id, raw: res.data };
  }

  async cancelPayment() {
    // Razorpay authorizations auto-void; there is no explicit cancel endpoint.
    return { cancelled: true };
  }

  async refundPayment({ providerPaymentRef, amount, idempotencyKey }) {
    const res = await this.http.post(`${BASE_URL}/payments/${providerPaymentRef}/refund`, {
      headers: { ...this.#authHeader(), ...(idempotencyKey ? { 'x-razorpay-idempotency': idempotencyKey } : {}) },
      body: { amount },
    });
    if (!res.ok) throw new Error(`Razorpay refund failed (${res.status})`);
    return { providerRefundRef: res.data.id, status: res.data.status === 'processed' ? 'completed' : 'processing', raw: res.data };
  }

  /** Webhook signature: HMAC_SHA256(rawBody, webhookSecret) === X-Razorpay-Signature. */
  verifyWebhook({ rawBody, headers = {} }) {
    const signature = headers['x-razorpay-signature'] ?? headers['X-Razorpay-Signature'];
    if (!signature || !this.credentials.webhookSecret) return { valid: false, reason: 'missing_signature' };
    const expected = createHmac('sha256', this.credentials.webhookSecret).update(rawBody).digest('hex');
    return { valid: safeEqualHex(expected, signature) };
  }

  parseWebhook({ rawBody, headers = {} }) {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const entity = body?.payload?.payment?.entity ?? body?.payload?.refund?.entity ?? {};
    // Normalize Razorpay statuses to the provider-independent lifecycle.
    const status = entity.status === 'captured' ? 'captured' : entity.status === 'authorized' ? 'authorized' : 'failed';
    return {
      eventId: headers['x-razorpay-event-id'] ?? `${body.event}:${entity.id ?? ''}`,
      eventType: body.event,
      providerPaymentRef: entity.id ?? null,
      providerIntentRef: entity.order_id ?? null,
      status,
      amount: entity.amount ?? null,
      raw: body,
    };
  }
}

export default RazorpayProvider;
