import { ProductAvailability } from '../models/product-availability.model.js';

import { CatalogScopedRepository } from './catalog-scoped.repository.js';

export class ProductAvailabilityRepository extends CatalogScopedRepository {
  constructor(model = ProductAvailability) {
    super(model, { softDelete: true });
  }

  findForBranch(scope, branchId, productId, variantId = null, options = {}) {
    return this.findOneScoped(scope, { branchId, productId, variantId }, options);
  }

  findByProduct(scope, productId, options = {}) {
    return this.findScoped(scope, { productId }, options);
  }

  findByBranch(scope, branchId, options = {}) {
    return this.findScoped(scope, { branchId }, options);
  }

  /** Upsert a branch override for a (product, variant) pair. */
  async upsertOverride(scope, { branchId, productId, variantId = null, ...patch }, options = {}) {
    const existing = await this.findForBranch(scope, branchId, productId, variantId, options);
    if (existing) {
      return this.updateById(existing.id ?? existing._id, patch, options);
    }
    return this.createScoped(scope, { branchId, productId, variantId, ...patch }, options);
  }
}

export const productAvailabilityRepository = new ProductAvailabilityRepository();
export default productAvailabilityRepository;
