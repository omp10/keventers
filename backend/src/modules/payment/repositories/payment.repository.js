import { PAYMENT_STATUS } from '../constants/payment.constants.js';
import { Payment } from '../models/payment.model.js';

import { PaymentScopedRepository } from './payment-scoped.repository.js';

export class PaymentRepository extends PaymentScopedRepository {
  constructor(model = Payment) {
    super(model, { softDelete: false, searchableFields: ['orderNumber', 'providerPaymentRef'] });
  }

  /** Global lookup by provider ref (the webhook path — server-supplied ref). */
  findByProviderRef(providerPaymentRef) {
    return this.findOne({ providerPaymentRef });
  }

  findByOrder(orderId) {
    return this.find({ orderId }, { sort: '-createdAt' });
  }

  /** Total already CAPTURED (or authorized) for an order — for multi-payment
   * balance checks. Aggregation-backed. */
  async sumSettledForOrder(orderId) {
    const [row] = await this.model.aggregate([
      { $match: { orderId: this.#oid(orderId), status: { $in: [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.PARTIALLY_REFUNDED] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return row?.total ?? 0;
  }

  #oid(id) {
    return this.model.base.Types.ObjectId.isValid(id) ? new this.model.base.Types.ObjectId(id) : id;
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, {
      ...params,
      allowedFilterFields: ['status', 'provider', 'method', 'orderId', 'customerUserId'],
    });
  }
}

export const paymentRepository = new PaymentRepository();
export default paymentRepository;
