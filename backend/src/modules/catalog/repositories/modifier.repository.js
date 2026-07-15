import { Modifier } from '../models/modifier.model.js';

import { CatalogScopedRepository } from './catalog-scoped.repository.js';

export class ModifierRepository extends CatalogScopedRepository {
  constructor(model = Modifier) {
    super(model, { softDelete: true, searchableFields: ['name'] });
  }

  findByGroup(scope, groupId, options = {}) {
    return this.findScoped(scope, { groupId }, { sort: 'displayOrder', ...options });
  }

  countByGroup(scope, groupId, options = {}) {
    return this.countScoped(scope, { groupId }, options);
  }

  /** Soft-delete every modifier in a group (when the group is removed). */
  softDeleteByGroup(scope, groupId, options = {}) {
    return this.updateManyScoped(scope, { groupId }, { deletedAt: new Date() }, options);
  }
}

export const modifierRepository = new ModifierRepository();
export default modifierRepository;
