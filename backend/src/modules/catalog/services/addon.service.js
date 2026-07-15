import { BaseService } from '#core/service/base.service.js';
import { getStorage } from '#platform/storage/index.js';

import { CATALOG_ERRORS, STORAGE_FOLDERS } from '../constants/catalog.constants.js';
import { toAddonDTO } from '../dto/catalog.dto.js';
import {
  AddonCreatedEvent,
  AddonDeletedEvent,
  AddonUpdatedEvent,
} from '../events/catalog.events.js';
import { addonRepository } from '../repositories/addon.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned, resolveScope } from '../utils/catalog-tenant.util.js';

/**
 * Add-on management. Add-ons (Extra Fries, Extra Drink, Ice Cream, Gift
 * Wrapping) are standalone priced extras REUSABLE across many products —
 * products reference them by id. Tenant-scoped.
 */
export class AddonService extends BaseService {
  constructor({ addons = addonRepository, storage, resolveScope: scopeResolver, eventBus } = {}) {
    super({ name: 'catalog.addon', eventBus });
    this.addons = addons;
    this.storage = storage ?? null;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  #storage() {
    return this.storage ?? getStorage();
  }

  async createAddon(tenant, restaurantId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const addon = await this.addons.createScoped(scope, {
      name: data.name,
      description: data.description ?? '',
      price: data.price ?? 0,
      calories: data.calories ?? null,
      imageUrl: data.imageUrl ?? null,
      imageKey: data.imageKey ?? null,
      isAvailable: data.isAvailable ?? true,
      displayOrder: data.displayOrder ?? 0,
    });
    await this.events.publish(
      new AddonCreatedEvent({ restaurantId: scope.restaurantId, addonId: entityId(addon) }),
    );
    this.audit.success('catalog.addon.created', { actorId, targetId: entityId(addon) });
    return toAddonDTO(addon);
  }

  async listAddons(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    if (query.status) filter.status = query.status;
    const page = await this.addons.paginateScoped(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? 'displayOrder',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'isAvailable'],
    });
    return this.paginated(page, toAddonDTO);
  }

  async getAddon(tenant, id) {
    const addon = await loadOwned(this.addons, tenant, id, CATALOG_ERRORS.ADDON_NOT_FOUND);
    return toAddonDTO(addon);
  }

  async updateAddon(tenant, id, data, actorId = null) {
    const addon = await loadOwned(this.addons, tenant, id, CATALOG_ERRORS.ADDON_NOT_FOUND);
    const patch = {};
    for (const key of ['name', 'description', 'price', 'calories', 'imageUrl', 'imageKey', 'isAvailable', 'displayOrder', 'status']) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    const updated = await this.addons.updateById(id, patch);
    await this.events.publish(
      new AddonUpdatedEvent({ restaurantId: String(addon.restaurantId), addonId: id, changes: Object.keys(patch) }),
    );
    this.audit.success('catalog.addon.updated', { actorId, targetId: id });
    return toAddonDTO(updated);
  }

  async uploadImage(tenant, id, file, actorId = null) {
    const addon = await loadOwned(this.addons, tenant, id, CATALOG_ERRORS.ADDON_NOT_FOUND);
    const up = await this.#storage().upload({
      buffer: file.buffer,
      filename: file.originalname ?? 'addon-image',
      mimeType: file.mimetype,
      folder: STORAGE_FOLDERS.ADDON_IMAGES,
    });
    const updated = await this.addons.updateById(id, { imageUrl: up.url, imageKey: up.key });
    this.audit.success('catalog.addon.image_uploaded', { actorId, targetId: id });
    return toAddonDTO(updated);
  }

  async deleteAddon(tenant, id, actorId = null) {
    const addon = await loadOwned(this.addons, tenant, id, CATALOG_ERRORS.ADDON_NOT_FOUND);
    await this.addons.softDeleteById(id);
    await this.events.publish(
      new AddonDeletedEvent({ restaurantId: String(addon.restaurantId), addonId: id }),
    );
    this.audit.success('catalog.addon.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }
}

export const addonService = new AddonService();
export default addonService;
