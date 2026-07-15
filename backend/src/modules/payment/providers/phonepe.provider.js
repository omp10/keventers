import { createHash, timingSafeEqual } from 'node:crypto';

import {
  ENVIRONMENT,
  PAYMENT_METHOD,
  PROVIDER,
} from '../constants/payment.constants.js';

import { PaymentProvider } from './payment-provider.interface.js';

const BASE_URL = Object.freeze({
  [ENVIRONMENT.TEST]: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
  [ENVIRONMENT.LIVE]: 'https://api.phonepe.com/apis/hermes',
});

function safeEqualHex(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * PhonePe adapter. Implements the common PaymentProvider interface using
 * PhonePe's checksum scheme: X-VERIFY = SHA256(base64Payload + endpoint +
 * saltKey) + '###' + saltIndex. The checksum computation + verification (the
 * security-critical part) is pure crypto and fully tested; the gateway calls go
 * through the injected HTTP client. Sandbox vs production is selected by
 * `credentials.environment`.
 */
export class PhonePeProvider extends PaymentProvider {
  constructor(deps = {}) {
    super(PROVIDER.PHONEPE, deps);
  }

  supportedMethods() {
    return [PAYMENT_METHOD.UPI, PAYMENT_METHOD.CREDIT_CARD, PAYMENT_METHOD.DEBIT_CARD, PAYMENT_METHOD.NET_BANKING, PAYMENT_METHOD.WALLET];
  }

  #base() {
    return BASE_URL[this.credentials.environment] ?? BASE_URL[ENVIRONMENT.TEST];
  }

  #saltIndex() {
    return this.credentials.extra?.saltIndex ?? '1';
  }

  /** X-VERIFY checksum for a base64 payload + endpoint path. */
  checksum(base64Payload, endpoint) {
    const hash = createHash('sha256').update(`${base64Payload}${endpoint}${this.credentials.secretKey}`).digest('hex');
    return `${hash}###${this.#saltIndex()}`;
  }

  async createPaymentIntent({ amount, orderNumber, merchantTransactionId }) {
    const endpoint = '/pg/v1/pay';
    const payload = {
      merchantId: this.credentials.merchantId,
      merchantTransactionId: merchantTransactionId ?? orderNumber,
      amount,
      redirectMode: 'POST',
      paymentInstrument: { type: 'PAY_PAGE' },
    };
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const xVerify = this.checksum(base64Payload, endpoint);
    const res = await this.http.post(`${this.#base()}${endpoint}`, {
      headers: { 'X-VERIFY': xVerify },
      body: { request: base64Payload },
    });
    if (!res.ok || res.data?.success === false) throw new Error(`PhonePe initiation failed (${res.status})`);
    const redirectUrl = res.data?.data?.instrumentResponse?.redirectInfo?.url ?? null;
    return {
      providerIntentRef: payload.merchantTransactionId,
      checkoutPayload: { provider: PROVIDER.PHONEPE, merchantTransactionId: payload.merchantTransactionId, redirectUrl },
      raw: res.data,
    };
  }

  generateCheckoutPayload({ providerIntentRef, redirectUrl = null }) {
    return { provider: PROVIDER.PHONEPE, merchantTransactionId: providerIntentRef, redirectUrl };
  }

  async fetchPayment({ providerPaymentRef }) {
    const endpoint = `/pg/v1/status/${this.credentials.merchantId}/${providerPaymentRef}`;
    const hash = createHash('sha256').update(`${endpoint}${this.credentials.secretKey}`).digest('hex');
    const res = await this.http.get(`${this.#base()}${endpoint}`, {
      headers: { 'X-VERIFY': `${hash}###${this.#saltIndex()}`, 'X-MERCHANT-ID': this.credentials.merchantId },
    });
    if (!res.ok) throw new Error(`PhonePe status failed (${res.status})`);
    return { status: res.data?.data?.state, amount: res.data?.data?.amount, raw: res.data };
  }

  /**
   * Verify a client callback: the caller supplies the base64 response body and
   * the X-VERIFY header; we recompute SHA256(base64Response + saltKey).
   */
  verifyPayment({ payload = {}, headers = {} }) {
    const base64Response = payload.response ?? payload.base64Response;
    const xVerify = headers['x-verify'] ?? headers['X-VERIFY'] ?? payload.checksum;
    if (!base64Response || !xVerify) return { valid: false, reason: 'missing_fields' };
    const [hash] = String(xVerify).split('###');
    const expected = createHash('sha256').update(`${base64Response}${this.credentials.secretKey}`).digest('hex');
    if (!safeEqualHex(expected, hash)) return { valid: false, reason: 'checksum_mismatch' };
    let decoded = {};
    try {
      decoded = JSON.parse(Buffer.from(base64Response, 'base64').toString('utf8'));
    } catch {
      return { valid: false, reason: 'bad_payload' };
    }
    const state = decoded?.data?.state ?? decoded?.code;
    return {
      valid: true,
      providerPaymentRef: decoded?.data?.merchantTransactionId ?? null,
      status: state === 'COMPLETED' || decoded?.code === 'PAYMENT_SUCCESS' ? 'captured' : 'failed',
    };
  }

  async capturePayment({ providerPaymentRef, amount, currency }) {
    // PhonePe pay-page captures synchronously; capture = confirm state via status.
    const state = await this.fetchPayment({ providerPaymentRef, amount, currency });
    const captured = state.status === 'COMPLETED';
    return { captured, providerTxnRef: providerPaymentRef, raw: state.raw };
  }

  async cancelPayment() {
    return { cancelled: true };
  }

  async refundPayment({ providerPaymentRef, amount, merchantRefundId }) {
    const endpoint = '/pg/v1/refund';
    const payload = {
      merchantId: this.credentials.merchantId,
      merchantTransactionId: merchantRefundId ?? `refund_${providerPaymentRef}`,
      originalTransactionId: providerPaymentRef,
      amount,
    };
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const res = await this.http.post(`${this.#base()}${endpoint}`, {
      headers: { 'X-VERIFY': this.checksum(base64Payload, endpoint) },
      body: { request: base64Payload },
    });
    if (!res.ok) throw new Error(`PhonePe refund failed (${res.status})`);
    return {
      providerRefundRef: payload.merchantTransactionId,
      status: res.data?.data?.state === 'COMPLETED' ? 'completed' : 'processing',
      raw: res.data,
    };
  }

  /** Webhook checksum: SHA256(rawBody + saltKey) === X-VERIFY hash portion. */
  verifyWebhook({ rawBody, headers = {} }) {
    const xVerify = headers['x-verify'] ?? headers['X-VERIFY'];
    if (!xVerify) return { valid: false, reason: 'missing_signature' };
    const [hash] = String(xVerify).split('###');
    const expected = createHash('sha256').update(`${rawBody}${this.credentials.secretKey}`).digest('hex');
    return { valid: safeEqualHex(expected, hash) };
  }

  parseWebhook({ rawBody }) {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const decoded = body.response
      ? JSON.parse(Buffer.from(body.response, 'base64').toString('utf8'))
      : body;
    const data = decoded?.data ?? {};
    const merchantTxn = data.merchantTransactionId ?? null;
    return {
      eventId: data.transactionId ?? merchantTxn ?? decoded?.code,
      eventType: decoded?.code ?? data.state,
      providerPaymentRef: merchantTxn,
      // For PhonePe the intent + payment share the merchantTransactionId.
      providerIntentRef: merchantTxn,
      status: data.state === 'COMPLETED' || decoded?.code === 'PAYMENT_SUCCESS' ? 'captured' : 'failed',
      amount: data.amount ?? null,
      raw: decoded,
    };
  }
}

export default PhonePeProvider;
