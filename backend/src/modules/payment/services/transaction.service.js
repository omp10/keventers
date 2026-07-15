import { BaseService } from '#core/service/base.service.js';

import { toTransactionDTO } from '../dto/payment.dto.js';
import { transactionRepository } from '../repositories/transaction.repository.js';
import { resolveStaffScope } from '../utils/tenant.util.js';
import { internalTxnId } from '../utils/reference.util.js';

/**
 * Transaction service — appends to the IMMUTABLE financial ledger. Every payment
 * operation records exactly one transaction here; nothing is ever updated. Reads
 * power financial reporting/reconciliation. Integer minor units.
 */
export class TransactionService extends BaseService {
  constructor({ transactions = transactionRepository, resolveScope = resolveStaffScope, eventBus } = {}) {
    super({ name: 'payment.transaction', eventBus });
    this.transactions = transactions;
    this.resolveScope = resolveScope;
  }

  /**
   * Append an immutable transaction. Retries once on the (astronomically rare)
   * internalTxnId collision.
   */
  async record(scope, data) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const txn = await this.transactions.createScoped(scope, {
          internalTxnId: internalTxnId(),
          providerTxnId: data.providerTxnId ?? null,
          gatewayReference: data.gatewayReference ?? null,
          orderId: data.orderId,
          paymentId: data.paymentId ?? null,
          refundId: data.refundId ?? null,
          type: data.type,
          amount: data.amount,
          currency: data.currency ?? 'INR',
          provider: data.provider ?? null,
          status: data.status,
          failureReason: data.failureReason ?? null,
          providerResponse: data.providerResponse ?? null,
        });
        this.audit.success('payment.transaction.recorded', { targetId: txn.id ?? String(txn._id), metadata: { type: data.type, amount: data.amount } });
        return toTransactionDTO(txn);
      } catch (err) {
        if (err?.code === 11000 && attempt < 2) continue;
        throw err;
      }
    }
    return null;
  }

  async listForStaff(tenant, restaurantId, branchId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const filter = {};
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.paymentId) filter.paymentId = query.paymentId;
    if (query.orderId) filter.orderId = query.orderId;
    const page = await this.transactions.paginateForStaff(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toTransactionDTO);
  }

  async listForPayment(paymentId) {
    const rows = await this.transactions.findByPayment(paymentId);
    return rows.map(toTransactionDTO);
  }
}

export const transactionService = new TransactionService();
export default transactionService;
