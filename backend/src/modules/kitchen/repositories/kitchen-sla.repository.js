import { KitchenSlaTarget } from '../models/kitchen-sla-target.model.js';

import { KitchenScopedRepository } from './kitchen-scoped.repository.js';

export class KitchenSlaRepository extends KitchenScopedRepository {
  constructor(model = KitchenSlaTarget) {
    super(model, { softDelete: true });
  }

  /** All active SLA targets for a branch (resolved most-specific-first by the service). */
  findActiveForBranch(scope) {
    return this.findScoped(scope, { isActive: true });
  }
}

export const kitchenSlaRepository = new KitchenSlaRepository();
export default kitchenSlaRepository;
