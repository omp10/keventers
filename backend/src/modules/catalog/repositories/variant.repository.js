import { Variant } from '../models/variant.model.js';

import { CatalogScopedRepository } from './catalog-scoped.repository.js';

export class VariantRepository extends CatalogScopedRepository {
  constructor(model = Variant) {
    super(model, { softDelete: true, searchableFields: ['name', 'sku'] });
  }

  findByProduct(scope, productId, options = {}) {
    return this.findScoped(scope, { productId }, { sort: 'displayOrder', ...options });
  }

  countByProduct(scope, productId, options = {}) {
    return this.countScoped(scope, { productId }, options);
  }

  existsBySku(scope, sku) {
    if (!sku) return Promise.resolve(false);
    return this.existsScoped(scope, { sku: String(sku) });
  }

  /** Clear the default flag for a product's variants (single default). */
  clearDefaults(scope, productId, options = {}) {
    return this.updateManyScoped(scope, { productId, isDefault: true }, { isDefault: false }, options);
  }
}

export const variantRepository = new VariantRepository();
export default variantRepository;
