import { Product } from '../models/product.model.js';

import { CatalogScopedRepository } from './catalog-scoped.repository.js';

export class ProductRepository extends CatalogScopedRepository {
  constructor(model = Product) {
    super(model, {
      softDelete: true,
      searchableFields: ['name', 'slug', 'sku', 'description'],
    });
  }

  existsBySlug(scope, slug) {
    return this.existsScoped(scope, { slug: String(slug).toLowerCase() });
  }

  existsBySku(scope, sku) {
    if (!sku) return Promise.resolve(false);
    return this.existsScoped(scope, { sku: String(sku) });
  }

  findByCategory(scope, categoryId, options = {}) {
    return this.findScoped(scope, { categoryId }, options);
  }

  countByCategory(scope, categoryId, options = {}) {
    return this.countScoped(scope, { categoryId }, options);
  }

  countByRootCategory(scope, rootCategoryId, options = {}) {
    return this.countScoped(scope, { rootCategoryId }, options);
  }

  /** Set the denormalised hasVariants flag after variant changes. */
  setHasVariants(scope, productId, hasVariants, options = {}) {
    return this.updateManyScoped(scope, { _id: productId }, { hasVariants }, options);
  }
}

export const productRepository = new ProductRepository();
export default productRepository;
