import { KitchenStation } from '../models/kitchen-station.model.js';

import { KitchenScopedRepository } from './kitchen-scoped.repository.js';

export class KitchenStationRepository extends KitchenScopedRepository {
  constructor(model = KitchenStation) {
    super(model, { softDelete: true, searchableFields: ['name', 'code', 'description'] });
  }

  existsByName(scope, name) {
    return this.existsScoped(scope, { name: String(name) });
  }

  findActiveForBranch(scope) {
    return this.findScoped(scope, { isActive: true }, { sort: 'displayOrder' });
  }

  paginateForBranch(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['type', 'isActive'] });
  }
}

export const kitchenStationRepository = new KitchenStationRepository();
export default kitchenStationRepository;
