import { Referral } from '../models/referral.model.js';

import { CustomerScopedRepository } from './customer-scoped.repository.js';

/** Referral repository (restaurant-scoped, code unique per restaurant). */
export class ReferralRepository extends CustomerScopedRepository {
  constructor(model = Referral) {
    super(model, { softDelete: false, searchableFields: ['code'] });
  }

  findByCode(scope, code) {
    return this.findOne({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, code: String(code).toUpperCase() });
  }

  findForReferrer(referrerCustomerId) {
    return this.find({ referrerCustomerId }, { sort: '-createdAt' });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status'] });
  }
}

export const referralRepository = new ReferralRepository();
export default referralRepository;
