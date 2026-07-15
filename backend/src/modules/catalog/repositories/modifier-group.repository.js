import { ModifierGroup } from '../models/modifier-group.model.js';

import { CatalogScopedRepository } from './catalog-scoped.repository.js';

export class ModifierGroupRepository extends CatalogScopedRepository {
  constructor(model = ModifierGroup) {
    super(model, { softDelete: true, searchableFields: ['name', 'description'] });
  }

  findAllScoped(scope, options = {}) {
    return this.findScoped(scope, {}, { sort: 'displayOrder', ...options });
  }
}

export const modifierGroupRepository = new ModifierGroupRepository();
export default modifierGroupRepository;
