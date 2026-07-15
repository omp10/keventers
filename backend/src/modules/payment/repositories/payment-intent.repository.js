import { PaymentIntent } from '../models/payment-intent.model.js';

import { PaymentScopedRepository } from './payment-scoped.repository.js';

export class PaymentIntentRepository extends PaymentScopedRepository {
  constructor(model = PaymentIntent) {
    super(model, { softDelete: false, searchableFields: ['orderNumber', 'providerIntentRef'] });
  }

  findByOrderAndKey(orderId, idempotencyKey) {
    if (!idempotencyKey) return Promise.resolve(null);
    return this.findOne({ orderId, idempotencyKey });
  }

  findByProviderRef(providerIntentRef) {
    return this.findOne({ providerIntentRef });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'provider', 'orderId'] });
  }
}

export const paymentIntentRepository = new PaymentIntentRepository();
export default paymentIntentRepository;
