import { LOYALTY_TXN_TYPE } from '../constants/customer.constants.js';
import { LoyaltyLedger } from '../models/loyalty-ledger.model.js';

import { CustomerScopedRepository } from './customer-scoped.repository.js';

/**
 * Loyalty ledger repository — APPEND-ONLY. Only creation + reads are permitted;
 * every update path throws (defense in depth alongside the model pre-hooks),
 * preserving an audit-grade points history. The unique
 * (customerId, source.type, source.id) index makes posting idempotent.
 */
export class LoyaltyLedgerRepository extends CustomerScopedRepository {
  constructor(model = LoyaltyLedger) {
    super(model, { softDelete: false, searchableFields: ['reference'] });
  }

  findByCustomer(customerId, options = {}) {
    return this.find({ customerId }, { sort: '-createdAt', ...options });
  }

  findBySource(customerId, sourceType, sourceId) {
    return this.findOne({ customerId, 'source.type': sourceType, 'source.id': sourceId });
  }

  /** Sum of signed points for a customer — the authoritative balance. */
  async computeBalance(customerId) {
    const [row] = await this.model.aggregate([
      { $match: { customerId: this.#oid(customerId) } },
      { $group: { _id: null, balance: { $sum: '$points' } } },
    ]);
    return row?.balance ?? 0;
  }

  /** Aggregate the cached-account fields directly from the ledger (rebuild). */
  async computeSnapshot(customerId) {
    const rows = await this.model.aggregate([
      { $match: { customerId: this.#oid(customerId) } },
      { $group: { _id: '$type', points: { $sum: '$points' } } },
    ]);
    const byType = Object.fromEntries(rows.map((r) => [r._id, r.points]));
    const earned = (byType[LOYALTY_TXN_TYPE.EARN] ?? 0) + (byType[LOYALTY_TXN_TYPE.BONUS] ?? 0);
    return {
      balance: rows.reduce((s, r) => s + r.points, 0),
      lifetimePoints: earned,
      redeemedPoints: Math.abs(byType[LOYALTY_TXN_TYPE.REDEEM] ?? 0),
      expiredPoints: Math.abs(byType[LOYALTY_TXN_TYPE.EXPIRE] ?? 0),
    };
  }

  /**
   * Unspent earn/bonus entries whose expiry has passed — candidates for the
   * expiration sweep. (Spent-vs-unspent netting is done in the service.)
   */
  findExpiryCandidates(now, limit = 500) {
    return this.find(
      {
        type: { $in: [LOYALTY_TXN_TYPE.EARN, LOYALTY_TXN_TYPE.BONUS] },
        expiresAt: { $ne: null, $lte: now },
      },
      { sort: 'expiresAt', limit },
    );
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['type', 'customerId'] });
  }

  paginateForCustomer(customerId, params = {}) {
    // `customerId` is the tenant boundary here and MUST be whitelisted, else
    // buildFilter strips it and the query leaks EVERY customer's ledger. Merge
    // any caller filter (e.g. `type`) rather than discarding it.
    return this.paginate({
      ...params,
      filter: { ...(params.filter ?? {}), customerId },
      allowedFilterFields: ['type', 'customerId'],
    });
  }

  #oid(id) {
    return this.model.base.Types.ObjectId.isValid(id) ? new this.model.base.Types.ObjectId(String(id)) : id;
  }

  // --- immutability guards ---
  updateById() {
    return Promise.reject(new Error('Loyalty ledger entries are immutable'));
  }
  updateOne() {
    return Promise.reject(new Error('Loyalty ledger entries are immutable'));
  }
  updateWithVersion() {
    return Promise.reject(new Error('Loyalty ledger entries are immutable'));
  }
}

export const loyaltyLedgerRepository = new LoyaltyLedgerRepository();
export default loyaltyLedgerRepository;
