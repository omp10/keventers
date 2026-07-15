import { REWARD_STATUS } from '../constants/customer.constants.js';
import { Reward } from '../models/reward.model.js';

import { CustomerScopedRepository } from './customer-scoped.repository.js';

/** Reward catalog repository (restaurant-scoped). */
export class RewardRepository extends CustomerScopedRepository {
  constructor(model = Reward) {
    super(model, { softDelete: true, searchableFields: ['name', 'description'] });
  }

  /** Active, in-window rewards for a restaurant (customer-facing catalog). */
  findActiveForRestaurant(scope, now = new Date()) {
    return this.find(
      {
        organizationId: scope.organizationId,
        restaurantId: scope.restaurantId,
        status: REWARD_STATUS.ACTIVE,
        deletedAt: null,
        $and: [
          { $or: [{ availableFrom: null }, { availableFrom: { $lte: now } }] },
          { $or: [{ availableUntil: null }, { availableUntil: { $gte: now } }] },
        ],
      },
      { sort: 'sortOrder pointsCost' },
    );
  }

  /** Atomically decrement finite stock (no-op when stock is null/unlimited). */
  async decrementStock(id) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, totalStock: { $ne: null, $gt: 0 } },
      { $inc: { totalStock: -1 } },
      { new: true },
    );
    return this.toDomain(doc);
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'type'] });
  }
}

export const rewardRepository = new RewardRepository();
export default rewardRepository;
