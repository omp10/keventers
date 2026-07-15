import { Addon } from '../models/addon.model.js';

import { CatalogScopedRepository } from './catalog-scoped.repository.js';

export class AddonRepository extends CatalogScopedRepository {
  constructor(model = Addon) {
    super(model, { softDelete: true, searchableFields: ['name', 'description'] });
  }

  findAllScoped(scope, options = {}) {
    return this.findScoped(scope, {}, { sort: 'displayOrder', ...options });
  }
}

export const addonRepository = new AddonRepository();
export default addonRepository;
