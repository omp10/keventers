import { RewardRedemption } from '../models/reward-redemption.model.js';

import { CustomerScopedRepository } from './customer-scoped.repository.js';

/** Reward redemption repository (restaurant-scoped). */
export class RewardRedemptionRepository extends CustomerScopedRepository {
  constructor(model = RewardRedemption) {
    super(model, { softDelete: false, searchableFields: ['code'] });
  }

  findByCode(code) {
    return this.findOne({ code });
  }

  findForCustomer(customerId, options = {}) {
    return this.find({ customerId }, { sort: '-createdAt', ...options });
  }

  countForCustomerReward(customerId, rewardId) {
    return this.count({ customerId, rewardId });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'rewardType', 'customerId'] });
  }
}

export const rewardRedemptionRepository = new RewardRedemptionRepository();
export default rewardRedemptionRepository;
