import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ConflictError } from '#core/errors/app-error.js';
import { getStorage } from '#platform/storage/index.js';

import {
  CATALOG_ERRORS,
  IMAGE_ROLE,
  PRODUCT_STATUS,
  STORAGE_FOLDERS,
} from '../constants/catalog.constants.js';
import { toProductDTO, toProductDetailDTO } from '../dto/catalog.dto.js';
import {
  ProductCreatedEvent,
  ProductDeletedEvent,
  ProductPriceChangedEvent,
  ProductUpdatedEvent,
} from '../events/catalog.events.js';
import { addonRepository } from '../repositories/addon.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { modifierGroupRepository } from '../repositories/modifier-group.repository.js';
import { modifierRepository } from '../repositories/modifier.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { variantRepository } from '../repositories/variant.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned, resolveScope } from '../utils/catalog-tenant.util.js';
import { uniqueSlug } from '../utils/slug.util.js';

/**
 * Product management — the core sellable-item engine. Handles CRUD, image
 * management (via the Storage Platform), category placement (with denormalised
 * rootCategoryId), pricing/availability changes and detail assembly (variants +
 * modifier groups + add-ons). Tenant-scoped; every mutation emits a domain
 * event and is audit-logged.
 */
export class ProductService extends BaseService {
  constructor({
    products = productRepository,
    categories = categoryRepository,
    variants = variantRepository,
    modifierGroups = modifierGroupRepository,
    modifiers = modifierRepository,
    addons = addonRepository,
    storage,
    resolveScope: scopeResolver,
    eventBus,
  } = {}) {
    super({ name: 'catalog.product', eventBus });
    this.products = products;
    this.categories = categories;
    this.variants = variants;
    this.modifierGroups = modifierGroups;
    this.modifiers = modifiers;
    this.addons = addons;
    this.storage = storage ?? null;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  #storage() {
    return this.storage ?? getStorage();
  }

  /** Resolve + validate the category and its denormalised root category id. */
  async #resolveCategory(scope, tenant, categoryId) {
    const category = await loadOwned(this.categories, tenant, categoryId, CATALOG_ERRORS.CATEGORY_NOT_FOUND);
    if (String(category.restaurantId) !== scope.restaurantId) {
      throw new BadRequestError(CATALOG_ERRORS.CROSS_TENANT);
    }
    const rootCategoryId = category.parentId ? String(category.parentId) : entityId(category);
    return { category, rootCategoryId };
  }

  async createProduct(tenant, restaurantId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const { rootCategoryId } = await this.#resolveCategory(scope, tenant, data.categoryId);

    if (data.sku && (await this.products.existsBySku(scope, data.sku))) {
      throw new ConflictError(CATALOG_ERRORS.DUPLICATE_SKU);
    }
    const slug = await uniqueSlug(data.slug || data.name, (s) => this.products.existsBySlug(scope, s), 'product');

    const product = await this.products.createScoped(scope, {
      categoryId: data.categoryId,
      rootCategoryId,
      menuIds: data.menuIds ?? [],
      name: data.name,
      slug,
      description: data.description ?? '',
      shortDescription: data.shortDescription ?? '',
      sku: data.sku ?? null,
      images: data.images ?? [],
      thumbnailUrl: data.thumbnailUrl ?? null,
      heroImageUrl: data.heroImageUrl ?? null,
      pricing: data.pricing ?? { basePrice: data.basePrice ?? 0 },
      taxCategory: data.taxCategory ?? 'standard',
      preparationTimeMinutes: data.preparationTimeMinutes ?? 0,
      dietaryTags: data.dietaryTags ?? [],
      allergens: data.allergens ?? [],
      spiceLevel: data.spiceLevel,
      nutrition: data.nutrition ?? {},
      tags: data.tags ?? [],
      modifierGroupIds: data.modifierGroupIds ?? [],
      addonIds: data.addonIds ?? [],
      availability: data.availability ?? {},
      status: data.status ?? PRODUCT_STATUS.DRAFT,
      isFeatured: data.isFeatured ?? false,
      isPopular: data.isPopular ?? false,
      isRecommended: data.isRecommended ?? false,
      displayOrder: data.displayOrder ?? 0,
      trackInventory: data.trackInventory ?? false,
    });

    await this.events.publish(
      new ProductCreatedEvent({
        restaurantId: scope.restaurantId,
        productId: entityId(product),
        categoryId: String(data.categoryId),
      }),
    );
    this.audit.success('catalog.product.created', { actorId, targetId: entityId(product) });
    return toProductDTO(product);
  }

  async listProducts(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.rootCategoryId) filter.rootCategoryId = query.rootCategoryId;
    if (query.menuId) filter.menuIds = query.menuId;
    if (query.status) filter.status = query.status;
    if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured;
    if (query.isPopular !== undefined) filter.isPopular = query.isPopular;
    if (query.spiceLevel) filter.spiceLevel = query.spiceLevel;
    if (query.dietaryTag) filter.dietaryTags = query.dietaryTag;
    // Range filters on base price via the operator-suffix syntax.
    if (query.minPrice !== undefined) filter['pricing.basePrice__gte'] = query.minPrice;
    if (query.maxPrice !== undefined) filter['pricing.basePrice__lte'] = query.maxPrice;

    const page = await this.products.paginateScoped(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? 'displayOrder',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: [
        'categoryId',
        'rootCategoryId',
        'menuIds',
        'status',
        'isFeatured',
        'isPopular',
        'spiceLevel',
        'dietaryTags',
        'pricing.basePrice',
      ],
    });
    return this.paginated(page, toProductDTO);
  }

  async getProduct(tenant, id) {
    const product = await loadOwned(this.products, tenant, id, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    return toProductDTO(product);
  }

  /** Full detail with variants, resolved modifier groups (+ their modifiers) and add-ons. */
  async getProductDetail(tenant, id) {
    const product = await loadOwned(this.products, tenant, id, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    const scope = {
      organizationId: String(product.organizationId),
      restaurantId: String(product.restaurantId),
    };

    const [variants, addons] = await Promise.all([
      this.variants.findByProduct(scope, entityId(product)),
      this.#resolveMany(this.addons, scope, product.addonIds),
    ]);

    const modifierGroups = [];
    for (const groupId of product.modifierGroupIds ?? []) {
      const group = await this.modifierGroups.findByIdScoped(scope, groupId);
      if (!group) continue;
      const groupModifiers = await this.modifiers.findByGroup(scope, entityId(group));
      modifierGroups.push({ group, modifiers: groupModifiers });
    }

    return toProductDetailDTO(product, { variants, modifierGroups, addons });
  }

  async #resolveMany(repo, scope, ids = []) {
    const out = [];
    for (const id of ids) {
      const doc = await repo.findByIdScoped(scope, id);
      if (doc) out.push(doc);
    }
    return out;
  }

  /**
   * Trusted product detail for ORDERING (cart/checkout), resolved from a
   * pre-authorized `{ organizationId, restaurantId }` scope rather than a staff
   * tenant context — the caller (Cart module) is bound to this restaurant via the
   * guest session's signed token. Returns the full detail (variants + modifier
   * groups + add-ons) ONLY if the product is ACTIVE and in scope; otherwise null.
   * Catalog stays the single authority on product data + component prices; the
   * Pricing Engine composes the totals.
   */
  async getForOrdering(scope, productId) {
    const s = { organizationId: scope.organizationId, restaurantId: scope.restaurantId };
    const product = await this.products.findByIdScoped(s, productId);
    if (!product || product.status !== PRODUCT_STATUS.ACTIVE) return null;

    const [variants, addons] = await Promise.all([
      this.variants.findByProduct(s, entityId(product)),
      this.#resolveMany(this.addons, s, product.addonIds),
    ]);

    const modifierGroups = [];
    for (const groupId of product.modifierGroupIds ?? []) {
      const group = await this.modifierGroups.findByIdScoped(s, groupId);
      if (!group) continue;
      const groupModifiers = await this.modifiers.findByGroup(s, entityId(group));
      modifierGroups.push({ group, modifiers: groupModifiers });
    }

    return toProductDetailDTO(product, { variants, modifierGroups, addons });
  }

  async updateProduct(tenant, id, data, actorId = null) {
    const product = await loadOwned(this.products, tenant, id, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    const scope = {
      organizationId: String(product.organizationId),
      restaurantId: String(product.restaurantId),
    };
    const patch = {};
    let priceChanged = false;

    for (const key of [
      'name',
      'description',
      'shortDescription',
      'taxCategory',
      'preparationTimeMinutes',
      'dietaryTags',
      'allergens',
      'spiceLevel',
      'nutrition',
      'tags',
      'menuIds',
      'modifierGroupIds',
      'addonIds',
      'status',
      'isFeatured',
      'isPopular',
      'isRecommended',
      'displayOrder',
      'trackInventory',
    ]) {
      if (data[key] !== undefined) patch[key] = data[key];
    }

    if (data.categoryId !== undefined && String(data.categoryId) !== String(product.categoryId)) {
      const { rootCategoryId } = await this.#resolveCategory(scope, tenant, data.categoryId);
      patch.categoryId = data.categoryId;
      patch.rootCategoryId = rootCategoryId;
    }

    if (data.sku !== undefined && data.sku !== product.sku) {
      if (data.sku && (await this.products.existsBySku(scope, data.sku))) {
        throw new ConflictError(CATALOG_ERRORS.DUPLICATE_SKU);
      }
      patch.sku = data.sku;
    }

    if (data.pricing !== undefined) {
      patch.pricing = { ...(product.pricing ?? {}), ...data.pricing };
      priceChanged = true;
    }
    if (data.availability !== undefined) {
      patch.availability = { ...(product.availability ?? {}), ...data.availability };
    }

    if ((data.slug || data.name) && (data.slug || data.name) !== product.slug) {
      const desired = data.slug || data.name;
      if (desired !== product.slug) {
        patch.slug = await uniqueSlug(desired, (s) => this.products.existsBySlug(scope, s), 'product');
      }
    }

    const updated = await this.products.updateById(id, patch);
    await this.events.publish(
      new ProductUpdatedEvent({ restaurantId: scope.restaurantId, productId: id, changes: Object.keys(patch) }),
    );
    if (priceChanged) {
      await this.events.publish(
        new ProductPriceChangedEvent({
          restaurantId: scope.restaurantId,
          productId: id,
          basePrice: updated.pricing?.basePrice ?? 0,
        }),
      );
    }
    this.audit.success('catalog.product.updated', { actorId, targetId: id });
    return toProductDTO(updated);
  }

  async deleteProduct(tenant, id, actorId = null) {
    const product = await loadOwned(this.products, tenant, id, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    const scope = {
      organizationId: String(product.organizationId),
      restaurantId: String(product.restaurantId),
    };
    // Cascade soft-delete the product's variants (own collection).
    const variants = await this.variants.findByProduct(scope, id);
    for (const v of variants) await this.variants.softDeleteById(entityId(v));

    await this.products.softDeleteById(id);
    await this.events.publish(
      new ProductDeletedEvent({ restaurantId: scope.restaurantId, productId: id }),
    );
    this.audit.success('catalog.product.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }

  // --- image management (Storage Platform) ---

  /**
   * Upload one or more product images (gallery). The first uploaded image
   * becomes the thumbnail/hero if none set yet. Files are multer memory buffers.
   */
  async uploadImages(tenant, id, files = [], actorId = null) {
    const product = await loadOwned(this.products, tenant, id, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestError('No image files provided');
    }
    const storage = this.#storage();
    const images = [...(product.images ?? [])];
    for (const file of files) {
      const up = await storage.upload({
        buffer: file.buffer,
        filename: file.originalname ?? 'product-image',
        mimeType: file.mimetype,
        folder: STORAGE_FOLDERS.PRODUCT_IMAGES,
      });
      images.push({
        role: IMAGE_ROLE.GALLERY,
        key: up.key,
        url: up.url,
        alt: product.name,
        displayOrder: images.length,
      });
    }
    const patch = { images };
    if (!product.thumbnailUrl) patch.thumbnailUrl = images[0]?.url ?? null;
    if (!product.heroImageUrl) patch.heroImageUrl = images[0]?.url ?? null;

    const updated = await this.products.updateById(id, patch);
    await this.events.publish(
      new ProductUpdatedEvent({ restaurantId: String(product.restaurantId), productId: id, changes: ['images'] }),
    );
    this.audit.success('catalog.product.images_uploaded', {
      actorId,
      targetId: id,
      metadata: { count: files.length },
    });
    return toProductDTO(updated);
  }

  /** Remove an image by its storage key; deletes the underlying object too. */
  async removeImage(tenant, id, imageKey, actorId = null) {
    const product = await loadOwned(this.products, tenant, id, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    const remaining = (product.images ?? []).filter((img) => img.key !== imageKey);
    if (imageKey) {
      try {
        await this.#storage().delete(imageKey);
      } catch (err) {
        this.logger.warn({ err, imageKey }, 'Storage delete failed (continuing)');
      }
    }
    const updated = await this.products.updateById(id, { images: remaining });
    this.audit.success('catalog.product.image_removed', { actorId, targetId: id });
    return toProductDTO(updated);
  }

  /**
   * Write a product's DERIVED dish rating. Trusted seam for the Customer
   * module, which owns the feedback these are computed from — the catalog never
   * calculates ratings itself, and nothing else may write these fields.
   */
  async applyRatingSystem(productId, { rating, ratingCount }) {
    await this.products.updateById(String(productId), { rating, ratingCount });
  }
}

export const productService = new ProductService();
export default productService;
