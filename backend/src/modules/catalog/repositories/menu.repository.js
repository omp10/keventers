import { Menu } from '../models/menu.model.js';

import { CatalogScopedRepository } from './catalog-scoped.repository.js';

export class MenuRepository extends CatalogScopedRepository {
  constructor(model = Menu) {
    super(model, { softDelete: true, searchableFields: ['name', 'slug', 'description'] });
  }

  existsBySlug(scope, slug) {
    return this.existsScoped(scope, { slug: String(slug).toLowerCase() });
  }

  findActive(scope, options = {}) {
    return this.findScoped(scope, { isActive: true }, options);
  }

  /** Clear the default/active flag across a restaurant's menus (single-default). */
  clearDefaults(scope, options = {}) {
    return this.updateManyScoped(scope, { isDefault: true }, { isDefault: false }, options);
  }
}

export const menuRepository = new MenuRepository();
export default menuRepository;
