import { BadRequestError } from '#core/errors/app-error.js';

import { PAYMENT_ERRORS, PROVIDER } from '../constants/payment.constants.js';

import { httpClient } from './http-client.js';
import { PhonePeProvider } from './phonepe.provider.js';
import { RazorpayProvider } from './razorpay.provider.js';

/**
 * Provider registry / factory. The PaymentService resolves a provider through
 * `create(name, credentials)` and depends only on the common interface — it
 * never references Razorpay/PhonePe directly. Adding Cashfree/Stripe/PayU/etc.
 * is a single `register()` call; no service changes.
 */
export class ProviderFactory {
  constructor({ http = httpClient } = {}) {
    this.http = http;
    this.registry = new Map([
      [PROVIDER.RAZORPAY, RazorpayProvider],
      [PROVIDER.PHONEPE, PhonePeProvider],
    ]);
  }

  /** Register a new provider adapter (future gateways). */
  register(name, ProviderClass) {
    this.registry.set(name, ProviderClass);
    return this;
  }

  supported() {
    return [...this.registry.keys()];
  }

  isSupported(name) {
    return this.registry.has(name);
  }

  /**
   * Instantiate a provider bound to a restaurant's (already-decrypted)
   * credentials. The service never learns which concrete class it received.
   * @param {string} name
   * @param {object} credentials
   * @returns {import('./payment-provider.interface.js').PaymentProvider}
   */
  create(name, credentials) {
    const ProviderClass = this.registry.get(name);
    if (!ProviderClass) throw new BadRequestError(PAYMENT_ERRORS.PROVIDER_NOT_SUPPORTED);
    return new ProviderClass({ http: this.http, credentials });
  }
}

export const providerFactory = new ProviderFactory();
export default providerFactory;
