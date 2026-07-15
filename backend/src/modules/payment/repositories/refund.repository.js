import { REFUND_STATUS } from '../constants/payment.constants.js';
import { Refund } from '../models/refund.model.js';

import { PaymentScopedRepository } from './payment-scoped.repository.js';

export class RefundRepository extends PaymentScopedRepository {
  constructor(model = Refund) {
    super(model, { softDelete: false, searchableFields: ['providerRefundRef', 'reason'] });
  }

  findByPaymentAndKey(paymentId, idempotencyKey) {
    if (!idempotencyKey) return Promise.resolve(null);
    return this.findOne({ paymentId, idempotencyKey });
  }

  findByProviderRef(providerRefundRef) {
    return this.findOne({ providerRefundRef });
  }

  /** Total refunds NOT failed for a payment (guards over-refunding). */
  async sumActiveForPayment(paymentId) {
    const [row] = await this.model.aggregate([
      { $match: { paymentId: this.#oid(paymentId), status: { $ne: REFUND_STATUS.FAILED } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return row?.total ?? 0;
  }

  #oid(id) {
    return this.model.base.Types.ObjectId.isValid(id) ? new this.model.base.Types.ObjectId(id) : id;
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'paymentId', 'orderId'] });
  }
}

export const refundRepository = new RefundRepository();
export default refundRepository;
