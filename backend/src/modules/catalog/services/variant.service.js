import { BaseService } from '#core/service/base.service.js';
import { ConflictError } from '#core/errors/app-error.js';

import { CATALOG_ERRORS } from '../constants/catalog.constants.js';
import { toVariantDTO } from '../dto/catalog.dto.js';
import {
  VariantCreatedEvent,
  VariantDeletedEvent,
  VariantUpdatedEvent,
} from '../events/catalog.events.js';
import { productRepository } from '../repositories/product.repository.js';
import { variantRepository } from '../repositories/variant.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned } from '../utils/catalog-tenant.util.js';

/**
 * Variant management. Variants (Small/Medium/Large, Regular/Family) live in
 * their own collection, each with its own price/SKU/availability/prep time. A
 * variant is always created against a product the caller owns; the product's
 * denormalised `hasVariants` flag is kept in sync. Tenant-scoped.
 */
export class VariantService extends BaseService {
  constructor({ variants = variantRepository, products = productRepository, eventBus } = {}) {
    super({ name: 'catalog.variant', eventBus });
    this.variants = variants;
    this.products = products;
  }

  async #productScope(tenant, productId) {
    const product = await loadOwned(this.products, tenant, productId, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    return {
      product,
      scope: {
        organizationId: String(product.organizationId),
        restaurantId: String(product.restaurantId),
      },
    };
  }

  async createVariant(tenant, productId, data, actorId = null) {
    const { scope } = await this.#productScope(tenant, productId);
    if (data.sku && (await this.variants.existsBySku(scope, data.sku))) {
      throw new ConflictError(CATALOG_ERRORS.DUPLICATE_SKU);
    }

    const variant = await this.variants.createScoped(scope, {
      productId,
      name: data.name,
      sku: data.sku ?? null,
      price: data.price ?? 0,
      compareAtPrice: data.compareAtPrice ?? null,
      isAvailable: data.isAvailable ?? true,
      preparationTimeMinutes: data.preparationTimeMinutes ?? null,
      isDefault: data.isDefault ?? false,
      displayOrder: data.displayOrder ?? 0,
    });

    if (data.isDefault) await this.#makeDefault(scope, productId, entityId(variant));
    await this.products.setHasVariants(scope, productId, true);

    await this.events.publish(
      new VariantCreatedEvent({ restaurantId: scope.restaurantId, productId, variantId: entityId(variant) }),
    );
    this.audit.success('catalog.variant.created', { actorId, targetId: entityId(variant) });
    return toVariantDTO(variant);
  }

  async listVariants(tenant, productId) {
    const { scope } = await this.#productScope(tenant, productId);
    const variants = await this.variants.findByProduct(scope, productId);
    return variants.map(toVariantDTO);
  }

  async getVariant(tenant, id) {
    const variant = await loadOwned(this.variants, tenant, id, CATALOG_ERRORS.VARIANT_NOT_FOUND);
    return toVariantDTO(variant);
  }

  async updateVariant(tenant, id, data, actorId = null) {
    const variant = await loadOwned(this.variants, tenant, id, CATALOG_ERRORS.VARIANT_NOT_FOUND);
    const scope = {
      organizationId: String(variant.organizationId),
      restaurantId: String(variant.restaurantId),
    };
    const patch = {};
    for (const key of [
      'name',
      'price',
      'compareAtPrice',
      'isAvailable',
      'preparationTimeMinutes',
      'displayOrder',
      'status',
    ]) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if (data.sku !== undefined && data.sku !== variant.sku) {
      if (data.sku && (await this.variants.existsBySku(scope, data.sku))) {
        throw new ConflictError(CATALOG_ERRORS.DUPLICATE_SKU);
      }
      patch.sku = data.sku;
    }

    const updated = await this.variants.updateById(id, patch);
    if (data.isDefault === true) await this.#makeDefault(scope, String(variant.productId), id);

    await this.events.publish(
      new VariantUpdatedEvent({ restaurantId: scope.restaurantId, variantId: id, changes: Object.keys(patch) }),
    );
    this.audit.success('catalog.variant.updated', { actorId, targetId: id });
    return toVariantDTO(updated);
  }

  async deleteVariant(tenant, id, actorId = null) {
    const variant = await loadOwned(this.variants, tenant, id, CATALOG_ERRORS.VARIANT_NOT_FOUND);
    const scope = {
      organizationId: String(variant.organizationId),
      restaurantId: String(variant.restaurantId),
    };
    await this.variants.softDeleteById(id);

    const remaining = await this.variants.countByProduct(scope, String(variant.productId));
    if (remaining === 0) await this.products.setHasVariants(scope, String(variant.productId), false);

    await this.events.publish(
      new VariantDeletedEvent({ restaurantId: scope.restaurantId, variantId: id, productId: String(variant.productId) }),
    );
    this.audit.success('catalog.variant.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }

  async #makeDefault(scope, productId, variantId) {
    await this.variants.clearDefaults(scope, productId);
    await this.variants.updateById(variantId, { isDefault: true });
  }
}

export const variantService = new VariantService();
export default variantService;
