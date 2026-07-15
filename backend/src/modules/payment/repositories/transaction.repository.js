import { Transaction } from '../models/transaction.model.js';

import { PaymentScopedRepository } from './payment-scoped.repository.js';

/**
 * Transaction repository — the immutable financial ledger. Only creation +
 * reads are permitted; any update path throws (defense in depth alongside the
 * model-level guard). This preserves audit-grade financial history.
 */
export class TransactionRepository extends PaymentScopedRepository {
  constructor(model = Transaction) {
    super(model, { softDelete: false, searchableFields: ['internalTxnId', 'providerTxnId', 'gatewayReference'] });
  }

  findByPayment(paymentId) {
    return this.find({ paymentId }, { sort: 'createdAt' });
  }

  findByInternalId(internalTxnId) {
    return this.findOne({ internalTxnId });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['type', 'status', 'provider', 'paymentId', 'orderId'] });
  }

  // --- immutability guards ---
  updateById() {
    return Promise.reject(new Error('Transactions are immutable'));
  }
  updateOne() {
    return Promise.reject(new Error('Transactions are immutable'));
  }
  updateWithVersion() {
    return Promise.reject(new Error('Transactions are immutable'));
  }
}

export const transactionRepository = new TransactionRepository();
export default transactionRepository;
