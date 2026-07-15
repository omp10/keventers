import { BaseService } from '#core/service/base.service.js';

import { CATALOG_ERRORS, MENU_STATUS } from '../constants/catalog.constants.js';
import { toMenuDTO } from '../dto/catalog.dto.js';
import {
  MenuArchivedEvent,
  MenuCreatedEvent,
  MenuDeletedEvent,
  MenuPublishedEvent,
  MenuUpdatedEvent,
} from '../events/catalog.events.js';
import { menuRepository } from '../repositories/menu.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned, resolveScope } from '../utils/catalog-tenant.util.js';
import { uniqueSlug } from '../utils/slug.util.js';

/**
 * Menu management: multiple menus per restaurant with scheduling, visibility,
 * versioning, publish/archive lifecycle and a single default/active menu.
 * Tenant-scoped. Only ACTIVE + published menus are surfaced to customers by the
 * public CatalogService.
 */
export class MenuService extends BaseService {
  constructor({ menus = menuRepository, resolveScope: scopeResolver, eventBus } = {}) {
    super({ name: 'catalog.menu', eventBus });
    this.menus = menus;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  async createMenu(tenant, restaurantId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const slug = await uniqueSlug(data.slug || data.name, (s) => this.menus.existsBySlug(scope, s), 'menu');

    const menu = await this.menus.createScoped(scope, {
      name: data.name,
      slug,
      description: data.description ?? '',
      type: data.type,
      status: data.status ?? MENU_STATUS.DRAFT,
      visibility: data.visibility,
      schedule: data.schedule ?? {},
      imageUrl: data.imageUrl ?? null,
      imageKey: data.imageKey ?? null,
      displayOrder: data.displayOrder ?? 0,
    });

    if (data.isDefault) await this.#makeDefault(scope, entityId(menu));

    await this.events.publish(
      new MenuCreatedEvent({ restaurantId: scope.restaurantId, menuId: entityId(menu) }),
    );
    this.audit.success('catalog.menu.created', { actorId, targetId: entityId(menu) });
    return toMenuDTO(await this.menus.findById(entityId(menu)));
  }

  async listMenus(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.visibility) filter.visibility = query.visibility;

    const page = await this.menus.paginateScoped(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? 'displayOrder',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'type', 'visibility', 'isActive'],
    });
    return this.paginated(page, toMenuDTO);
  }

  async getMenu(tenant, id) {
    const menu = await loadOwned(this.menus, tenant, id, CATALOG_ERRORS.MENU_NOT_FOUND);
    return toMenuDTO(menu);
  }

  async updateMenu(tenant, id, data, actorId = null) {
    const menu = await loadOwned(this.menus, tenant, id, CATALOG_ERRORS.MENU_NOT_FOUND);
    const scope = { organizationId: String(menu.organizationId), restaurantId: String(menu.restaurantId) };
    const patch = {};

    for (const key of ['name', 'description', 'type', 'visibility', 'schedule', 'imageUrl', 'imageKey', 'displayOrder']) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if ((data.slug || data.name) && (data.slug || data.name) !== menu.slug) {
      const desired = data.slug || data.name;
      if (desired !== menu.slug) {
        patch.slug = await uniqueSlug(desired, (s) => this.menus.existsBySlug(scope, s), 'menu');
      }
    }

    const updated = await this.menus.updateById(id, patch);
    if (data.isDefault === true) await this.#makeDefault(scope, id);

    await this.events.publish(
      new MenuUpdatedEvent({ restaurantId: scope.restaurantId, menuId: id, changes: Object.keys(patch) }),
    );
    this.audit.success('catalog.menu.updated', { actorId, targetId: id });
    return toMenuDTO(await this.menus.findById(id));
  }

  /** Publish → ACTIVE + visible, bump version, stamp publishedAt. */
  async publishMenu(tenant, id, actorId = null) {
    const menu = await loadOwned(this.menus, tenant, id, CATALOG_ERRORS.MENU_NOT_FOUND);
    const updated = await this.menus.updateById(id, {
      status: MENU_STATUS.ACTIVE,
      isActive: true,
      version: (menu.version ?? 1) + 1,
      publishedAt: new Date(),
      publishedBy: actorId,
    });
    await this.events.publish(
      new MenuPublishedEvent({
        restaurantId: String(menu.restaurantId),
        menuId: id,
        version: updated.version,
      }),
    );
    this.audit.success('catalog.menu.published', { actorId, targetId: id, metadata: { version: updated.version } });
    return toMenuDTO(updated);
  }

  /** Archive → ARCHIVED + hidden from customers. */
  async archiveMenu(tenant, id, actorId = null) {
    const menu = await loadOwned(this.menus, tenant, id, CATALOG_ERRORS.MENU_NOT_FOUND);
    const updated = await this.menus.updateById(id, {
      status: MENU_STATUS.ARCHIVED,
      isActive: false,
      isDefault: false,
    });
    await this.events.publish(
      new MenuArchivedEvent({ restaurantId: String(menu.restaurantId), menuId: id }),
    );
    this.audit.success('catalog.menu.archived', { actorId, targetId: id });
    return toMenuDTO(updated);
  }

  async deleteMenu(tenant, id, actorId = null) {
    const menu = await loadOwned(this.menus, tenant, id, CATALOG_ERRORS.MENU_NOT_FOUND);
    await this.menus.softDeleteById(id);
    await this.events.publish(
      new MenuDeletedEvent({ restaurantId: String(menu.restaurantId), menuId: id }),
    );
    this.audit.success('catalog.menu.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }

  /** Clear existing defaults then mark one menu default+active (single default). */
  async #makeDefault(scope, menuId) {
    await this.menus.clearDefaults(scope);
    await this.menus.updateById(menuId, { isDefault: true, isActive: true });
  }
}

export const menuService = new MenuService();
export default menuService;
