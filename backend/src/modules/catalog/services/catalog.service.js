import { BaseService } from '#core/service/base.service.js';
import { cacheService } from '#core/cache/cache.service.js';

import {
  CATALOG_CACHE,
  MENU_STATUS,
  MENU_VISIBILITY,
  PRODUCT_STATUS,
} from '../constants/catalog.constants.js';
import {
  toCategoryDTO,
  toMenuDTO,
  toProductDTO,
} from '../dto/catalog.dto.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { menuRepository } from '../repositories/menu.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { entityId } from '../utils/id.util.js';
import { resolveScope } from '../utils/catalog-tenant.util.js';

/**
 * Aggregate catalog retrieval. Assembles the full menu → category → product
 * tree for a restaurant and serves it from Redis for the PUBLIC (customer-
 * facing) view. Only the published, customer-visible catalog is cached; the
 * cache is invalidated by the module's event handlers on any mutation. Tenant-
 * sensitive administrative data is NEVER cached (see getCatalogStats).
 */
export class CatalogService extends BaseService {
  constructor({
    menus = menuRepository,
    categories = categoryRepository,
    products = productRepository,
    cache = cacheService,
    resolveScope: scopeResolver,
    eventBus,
  } = {}) {
    super({ name: 'catalog.catalog', eventBus });
    this.menus = menus;
    this.categories = categories;
    this.products = products;
    this.cacheStore = cache;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  /**
   * Full published catalog for a restaurant, served from Redis (public view).
   * Key deliberately uses the PUBLIC_CATALOG prefix so the event handlers'
   * pattern invalidation clears it on any catalog change.
   */
  async getFullCatalog(tenant, restaurantId) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const key = `${CATALOG_CACHE.PUBLIC_CATALOG_PREFIX}:${scope.restaurantId}`;
    return this.cacheStore.getOrSet(key, CATALOG_CACHE.TTL_SECONDS, () =>
      this.#assembleCatalog(scope),
    );
  }

  /** One published menu's tree (categories + products), cached. */
  async getPublicMenu(tenant, restaurantId, menuId) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const key = `${CATALOG_CACHE.PUBLIC_MENU_PREFIX}:${scope.restaurantId}:${menuId}`;
    return this.cacheStore.getOrSet(key, CATALOG_CACHE.TTL_SECONDS, async () => {
      const menu = await this.menus.findByIdScoped(scope, menuId);
      if (!menu || menu.status !== MENU_STATUS.ACTIVE) return null;
      return this.#assembleMenu(scope, menu);
    });
  }

  /**
   * Public active-menu tree for a restaurant, resolved from a TRUSTED scope
   * (organizationId + restaurantId) rather than a tenant context. For internal
   * server flows already authorized by other means — e.g. the QR Ordering
   * gateway returning the active menu in a guest's restaurant context. Served
   * from Redis (same public-menu keyspace, invalidated on catalog mutations).
   * Returns null when the restaurant has no active menu.
   */
  async getPublicActiveMenu(scope) {
    const key = `${CATALOG_CACHE.PUBLIC_MENU_PREFIX}:${scope.restaurantId}:active`;
    return this.cacheStore.getOrSet(key, CATALOG_CACHE.TTL_SECONDS, async () => {
      const active = await this.menus.findScoped(
        scope,
        { status: MENU_STATUS.ACTIVE, isActive: true },
        { sort: '-isDefault' },
      );
      const menu = active.find((m) => m.isDefault) ?? active[0];
      if (!menu) return null;
      return this.#assembleMenu(scope, menu);
    });
  }

  async #assembleCatalog(scope) {
    const menus = await this.menus.findScoped(
      scope,
      { status: MENU_STATUS.ACTIVE, visibility: MENU_VISIBILITY.PUBLIC },
      { sort: 'displayOrder' },
    );
    const assembled = [];
    for (const menu of menus) {
      assembled.push(await this.#assembleMenu(scope, menu));
    }
    return { restaurantId: scope.restaurantId, menus: assembled };
  }

  async #assembleMenu(scope, menu) {
    const mains = await this.categories.findScoped(
      scope,
      { menuId: entityId(menu), parentId: null, status: 'active' },
      { sort: 'displayOrder' },
    );
    const categories = [];
    for (const main of mains) {
      const subs = await this.categories.findScoped(
        scope,
        { parentId: entityId(main), status: 'active' },
        { sort: 'displayOrder' },
      );
      const categoryIds = [entityId(main), ...subs.map(entityId)];
      const products = await this.products.findScoped(
        scope,
        { categoryId: { $in: categoryIds }, status: PRODUCT_STATUS.ACTIVE },
        { sort: 'displayOrder' },
      );
      categories.push({
        ...toCategoryDTO(main),
        subcategories: subs.map(toCategoryDTO),
        products: products.map(toProductDTO),
      });
    }
    return { ...toMenuDTO(menu), categories };
  }

  /**
   * Administrative catalog snapshot (counts) for troubleshooting. NOT cached —
   * this is tenant-sensitive operational data. Used by the platform admin
   * inspection endpoint and the restaurant dashboard overview.
   */
  async getCatalogStats(tenant, restaurantId) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const [menus, categories, products] = await Promise.all([
      this.menus.countScoped(scope, {}),
      this.categories.countScoped(scope, {}),
      this.products.countScoped(scope, {}),
    ]);
    const [activeMenus, activeProducts] = await Promise.all([
      this.menus.countScoped(scope, { status: MENU_STATUS.ACTIVE }),
      this.products.countScoped(scope, { status: PRODUCT_STATUS.ACTIVE }),
    ]);
    return {
      restaurantId: scope.restaurantId,
      counts: {
        menus,
        activeMenus,
        categories,
        products,
        activeProducts,
      },
    };
  }
}

export const catalogService = new CatalogService();
export default catalogService;
