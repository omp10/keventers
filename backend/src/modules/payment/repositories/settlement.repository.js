import { Settlement } from '../models/settlement.model.js';

import { PaymentScopedRepository } from './payment-scoped.repository.js';

export class SettlementRepository extends PaymentScopedRepository {
  constructor(model = Settlement) {
    super(model, { softDelete: false, searchableFields: ['reference'] });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'provider'] });
  }
}

export const settlementRepository = new SettlementRepository();
export default settlementRepository;
