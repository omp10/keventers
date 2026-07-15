import { Category } from '../models/category.model.js';

import { CatalogScopedRepository } from './catalog-scoped.repository.js';

export class CategoryRepository extends CatalogScopedRepository {
  constructor(model = Category) {
    super(model, { softDelete: true, searchableFields: ['name', 'slug', 'description'] });
  }

  existsBySlug(scope, slug) {
    return this.existsScoped(scope, { slug: String(slug).toLowerCase() });
  }

  /** Main categories (parentId = null). */
  findMainCategories(scope, options = {}) {
    return this.findScoped(scope, { parentId: null }, options);
  }

  /** Direct children of a parent category (subcategories). */
  findChildren(scope, parentId, options = {}) {
    return this.findScoped(scope, { parentId }, options);
  }

  countChildren(scope, parentId, options = {}) {
    return this.countScoped(scope, { parentId }, options);
  }
}

export const categoryRepository = new CategoryRepository();
export default categoryRepository;
