import { LoyaltyAccount } from '../models/loyalty-account.model.js';

import { CustomerScopedRepository } from './customer-scoped.repository.js';

/**
 * Loyalty account repository — the fast-read projection. Balance mutations go
 * through `applyDelta` (atomic `$inc` + accumulator updates), so concurrent
 * ledger posts never lose an update. The ledger remains authoritative;
 * `rebuild` re-projects the cached aggregates from a computed snapshot.
 */
export class LoyaltyAccountRepository extends CustomerScopedRepository {
  constructor(model = LoyaltyAccount) {
    super(model, { softDelete: false });
  }

  findByCustomer(customerId) {
    return this.findOne({ customerId });
  }

  /** Atomic find-or-create for a customer's loyalty account. */
  async ensureForCustomer(scope, customerId, userId) {
    const doc = await this.model.findOneAndUpdate(
      { customerId },
      {
        $setOnInsert: {
          organizationId: scope.organizationId,
          restaurantId: scope.restaurantId,
          customerId,
          userId,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return this.toDomain(doc);
  }

  /**
   * Atomically apply a points delta and accumulator updates to the account.
   * @param {string} customerId
   * @param {{ balance:number, lifetimePoints?:number, redeemedPoints?:number, expiredPoints?:number }} inc
   * @param {object} set  fields to $set (tier, timestamps)
   */
  async applyDelta(customerId, inc, set = {}) {
    const $inc = { version: 1 };
    for (const [k, v] of Object.entries(inc)) if (v) $inc[k] = v;
    const doc = await this.model.findOneAndUpdate(
      { customerId },
      { $inc, ...(Object.keys(set).length ? { $set: set } : {}) },
      { new: true },
    );
    return this.toDomain(doc);
  }

  /** Overwrite the cached aggregates (ledger rebuild / correction). */
  async rebuild(customerId, snapshot) {
    const doc = await this.model.findOneAndUpdate({ customerId }, { $set: snapshot, $inc: { version: 1 } }, { new: true });
    return this.toDomain(doc);
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['tier'] });
  }
}

export const loyaltyAccountRepository = new LoyaltyAccountRepository();
export default loyaltyAccountRepository;
