import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ConflictError } from '#core/errors/app-error.js';

import { CATALOG_ERRORS, CATEGORY_STATUS } from '../constants/catalog.constants.js';
import { toCategoryDTO, toCategoryTreeDTO } from '../dto/catalog.dto.js';
import {
  CategoryCreatedEvent,
  CategoryDeletedEvent,
  CategoryUpdatedEvent,
} from '../events/catalog.events.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned, resolveScope } from '../utils/catalog-tenant.util.js';
import { uniqueSlug } from '../utils/slug.util.js';

/**
 * Category management. A SINGLE self-referencing Category model represents both
 * main categories (parentId=null) and subcategories (parentId set). The service
 * is the sole enforcer of the MAX DEPTH = 2 rule: a subcategory can never be
 * used as a parent, so the tree is at most main → subcategory. Tenant-scoped.
 */
export class CategoryService extends BaseService {
  constructor({ categories = categoryRepository, products = productRepository, resolveScope: scopeResolver, eventBus } = {}) {
    super({ name: 'catalog.category', eventBus });
    this.categories = categories;
    this.products = products;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  /** Validate + normalise the parent, returning { parentId, depth }. */
  async #resolveParent(scope, tenant, parentId) {
    if (!parentId) return { parentId: null, depth: 0 };
    const parent = await loadOwned(this.categories, tenant, parentId, CATALOG_ERRORS.PARENT_CATEGORY_NOT_FOUND);
    // Enforce max depth 2: the parent must itself be a MAIN category (depth 0).
    if (parent.parentId || parent.depth >= 1) {
      throw new BadRequestError(CATALOG_ERRORS.SUBCATEGORY_AS_PARENT);
    }
    return { parentId: entityId(parent), depth: 1 };
  }

  async createCategory(tenant, restaurantId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const { parentId, depth } = await this.#resolveParent(scope, tenant, data.parentId);

    const slug = await uniqueSlug(
      data.slug || data.name,
      (s) => this.categories.existsBySlug(scope, s),
      'category',
    );

    const category = await this.categories.createScoped(scope, {
      menuId: data.menuId ?? null,
      parentId,
      depth,
      name: data.name,
      slug,
      description: data.description ?? '',
      imageUrl: data.imageUrl ?? null,
      imageKey: data.imageKey ?? null,
      iconUrl: data.iconUrl ?? null,
      status: data.status ?? CATEGORY_STATUS.ACTIVE,
      isFeatured: data.isFeatured ?? false,
      displayOrder: data.displayOrder ?? 0,
    });

    await this.events.publish(
      new CategoryCreatedEvent({
        restaurantId: scope.restaurantId,
        categoryId: entityId(category),
        parentId,
      }),
    );
    this.audit.success('catalog.category.created', { actorId, targetId: entityId(category) });
    return toCategoryDTO(category);
  }

  async listCategories(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.menuId) filter.menuId = query.menuId;
    // parentId filter: 'null'/'main' → main categories; an id → its children.
    if (query.parentId === 'main' || query.parentId === 'null') filter.parentId = null;
    else if (query.parentId) filter.parentId = query.parentId;

    const page = await this.categories.paginateScoped(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? 'displayOrder',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'menuId', 'parentId', 'isFeatured'],
    });
    return this.paginated(page, toCategoryDTO);
  }

  /** Full main→sub tree for a restaurant (used by dashboards / menu builders). */
  async getCategoryTree(tenant, restaurantId) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const mains = await this.categories.findMainCategories(scope, { sort: 'displayOrder' });
    const tree = [];
    for (const main of mains) {
      const children = await this.categories.findChildren(scope, entityId(main), {
        sort: 'displayOrder',
      });
      tree.push(toCategoryTreeDTO(main, children));
    }
    return tree;
  }

  async getCategory(tenant, id) {
    const category = await loadOwned(this.categories, tenant, id, CATALOG_ERRORS.CATEGORY_NOT_FOUND);
    return toCategoryDTO(category);
  }

  async updateCategory(tenant, id, data, actorId = null) {
    const category = await loadOwned(this.categories, tenant, id, CATALOG_ERRORS.CATEGORY_NOT_FOUND);
    const scope = {
      organizationId: String(category.organizationId),
      restaurantId: String(category.restaurantId),
    };
    const patch = {};

    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.menuId !== undefined) patch.menuId = data.menuId;
    if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
    if (data.iconUrl !== undefined) patch.iconUrl = data.iconUrl;
    if (data.status !== undefined) patch.status = data.status;
    if (data.isFeatured !== undefined) patch.isFeatured = data.isFeatured;
    if (data.displayOrder !== undefined) patch.displayOrder = data.displayOrder;

    // Re-parenting: re-validate depth and forbid cycles.
    if (data.parentId !== undefined) {
      if (data.parentId && String(data.parentId) === String(id)) {
        throw new BadRequestError(CATALOG_ERRORS.SELF_PARENT);
      }
      // A category that already has children cannot become a subcategory.
      const childCount = await this.categories.countChildren(scope, id);
      if (data.parentId && childCount > 0) {
        throw new BadRequestError(CATALOG_ERRORS.MAX_DEPTH_EXCEEDED);
      }
      const { parentId, depth } = await this.#resolveParent(scope, tenant, data.parentId);
      patch.parentId = parentId;
      patch.depth = depth;
    }

    if (data.slug !== undefined || data.name !== undefined) {
      const desired = data.slug || data.name;
      if (desired && desired !== category.slug) {
        patch.slug = await uniqueSlug(
          desired,
          (s) => this.categories.existsBySlug(scope, s),
          'category',
        );
      }
    }

    const updated = await this.categories.updateById(id, patch);
    await this.events.publish(
      new CategoryUpdatedEvent({ restaurantId: scope.restaurantId, categoryId: id, changes: Object.keys(patch) }),
    );
    this.audit.success('catalog.category.updated', { actorId, targetId: id });
    return toCategoryDTO(updated);
  }

  async deleteCategory(tenant, id, actorId = null) {
    const category = await loadOwned(this.categories, tenant, id, CATALOG_ERRORS.CATEGORY_NOT_FOUND);
    const scope = {
      organizationId: String(category.organizationId),
      restaurantId: String(category.restaurantId),
    };

    const childCount = await this.categories.countChildren(scope, id);
    if (childCount > 0) throw new ConflictError(CATALOG_ERRORS.CATEGORY_HAS_CHILDREN);

    const productCount = await this.products.countByCategory(scope, id);
    if (productCount > 0) throw new ConflictError(CATALOG_ERRORS.CATEGORY_HAS_PRODUCTS);

    await this.categories.softDeleteById(id);
    await this.events.publish(
      new CategoryDeletedEvent({ restaurantId: scope.restaurantId, categoryId: id }),
    );
    this.audit.success('catalog.category.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }
}

export const categoryService = new CategoryService();
export default categoryService;
