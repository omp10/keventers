/**
 * Common Payment Provider contract (Adapter / Strategy pattern). The
 * PaymentService NEVER knows which provider it is talking to — it depends only
 * on this interface, resolved per-restaurant by the ProviderFactory. Adding a
 * provider (Cashfree, Stripe, PayU, Juspay, Paytm) means implementing this
 * interface — the services never change.
 *
 * All monetary values are integer MINOR units (paise). Credentials are passed in
 * (already decrypted by the config service) and NEVER logged or returned.
 *
 * @typedef {object} ProviderCredentials
 * @property {string} merchantId
 * @property {string} apiKey
 * @property {string} secretKey
 * @property {string} webhookSecret
 * @property {string} environment  'test' | 'live'
 * @property {object} [extra]      provider-specific (e.g. PhonePe saltIndex)
 *
 * @typedef {object} IntentResult
 * @property {string} providerIntentRef
 * @property {object} checkoutPayload   Non-secret payload the client SDK uses.
 * @property {object} [raw]
 *
 * @typedef {object} VerifyResult
 * @property {boolean} valid
 * @property {string} [providerPaymentRef]
 * @property {string} [status]
 * @property {string} [reason]
 *
 * @typedef {object} CaptureResult
 * @property {boolean} captured
 * @property {string} [providerTxnRef]
 * @property {object} [raw]
 *
 * @typedef {object} RefundResult
 * @property {string} providerRefundRef
 * @property {string} status
 * @property {object} [raw]
 *
 * @typedef {object} WebhookParseResult
 * @property {string} eventId
 * @property {string} eventType
 * @property {string} [providerPaymentRef]
 * @property {string} status
 * @property {number} [amount]
 * @property {object} [raw]
 */
export class PaymentProvider {
  /** @param {string} name @param {object} deps */
  constructor(name, { http, credentials } = {}) {
    this.name = name;
    this.http = http;
    this.credentials = credentials ?? {};
  }

  /* eslint-disable no-unused-vars, class-methods-use-this */
  /** @returns {string[]} Methods this provider supports. */
  supportedMethods() {
    return [];
  }

  /** @returns {Promise<IntentResult>} */
  async createPaymentIntent(params) {
    throw new Error(`${this.name}: createPaymentIntent() not implemented`);
  }

  /** @returns {Promise<object>} Current payment state from the gateway. */
  async fetchPayment(params) {
    throw new Error(`${this.name}: fetchPayment() not implemented`);
  }

  /** Verify a client-returned payment result (signature). @returns {VerifyResult} */
  verifyPayment(params) {
    throw new Error(`${this.name}: verifyPayment() not implemented`);
  }

  /** @returns {Promise<CaptureResult>} */
  async capturePayment(params) {
    throw new Error(`${this.name}: capturePayment() not implemented`);
  }

  /** @returns {Promise<object>} */
  async cancelPayment(params) {
    throw new Error(`${this.name}: cancelPayment() not implemented`);
  }

  /** @returns {Promise<RefundResult>} */
  async refundPayment(params) {
    throw new Error(`${this.name}: refundPayment() not implemented`);
  }

  /** Verify a webhook signature. @returns {{ valid: boolean, reason?: string }} */
  verifyWebhook(params) {
    throw new Error(`${this.name}: verifyWebhook() not implemented`);
  }

  /** @returns {WebhookParseResult} */
  parseWebhook(params) {
    throw new Error(`${this.name}: parseWebhook() not implemented`);
  }

  /** Non-secret payload for the client checkout SDK. @returns {object} */
  generateCheckoutPayload(params) {
    throw new Error(`${this.name}: generateCheckoutPayload() not implemented`);
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

export default PaymentProvider;
