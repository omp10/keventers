import { BaseService } from '#core/service/base.service.js';
import { BadRequestError } from '#core/errors/app-error.js';

import {
  CATALOG_ERRORS,
  MODIFIER_GROUP_TYPE,
} from '../constants/catalog.constants.js';
import { toModifierDTO, toModifierGroupDTO } from '../dto/catalog.dto.js';
import {
  ModifierAddedEvent,
  ModifierGroupCreatedEvent,
  ModifierGroupDeletedEvent,
  ModifierGroupUpdatedEvent,
  ModifierRemovedEvent,
  ModifierUpdatedEvent,
} from '../events/catalog.events.js';
import { modifierGroupRepository } from '../repositories/modifier-group.repository.js';
import { modifierRepository } from '../repositories/modifier.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned, resolveScope } from '../utils/catalog-tenant.util.js';

/**
 * Modifier group + modifier management. Groups (Choose Size, Choose Sugar) are
 * REUSABLE across products; modifiers (Extra Cheese, No Onion) belong to a
 * group. Selection bounds (required, min/max) are validated here and enforced
 * by the cart/order modules at add-to-cart time. Tenant-scoped.
 */
export class ModifierService extends BaseService {
  constructor({ groups = modifierGroupRepository, modifiers = modifierRepository, resolveScope: scopeResolver, eventBus } = {}) {
    super({ name: 'catalog.modifier', eventBus });
    this.groups = groups;
    this.modifiers = modifiers;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  /** Validate selection bounds coherence (min <= max, required implies min>=1). */
  #validateBounds({ type, isRequired, minSelection, maxSelection }) {
    const min = minSelection ?? 0;
    const max = maxSelection ?? null;
    if (max != null && min > max) throw new BadRequestError(CATALOG_ERRORS.INVALID_MODIFIER_SELECTION);
    if (type === MODIFIER_GROUP_TYPE.SINGLE && max != null && max > 1) {
      throw new BadRequestError(CATALOG_ERRORS.INVALID_MODIFIER_SELECTION);
    }
    if (isRequired && min < 1) throw new BadRequestError(CATALOG_ERRORS.INVALID_MODIFIER_SELECTION);
  }

  // --- groups ---

  async createGroup(tenant, restaurantId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    this.#validateBounds(data);
    const group = await this.groups.createScoped(scope, {
      name: data.name,
      description: data.description ?? '',
      type: data.type ?? MODIFIER_GROUP_TYPE.SINGLE,
      isRequired: data.isRequired ?? false,
      minSelection: data.minSelection ?? 0,
      maxSelection: data.maxSelection ?? 1,
      displayOrder: data.displayOrder ?? 0,
    });
    await this.events.publish(
      new ModifierGroupCreatedEvent({ restaurantId: scope.restaurantId, groupId: entityId(group) }),
    );
    this.audit.success('catalog.modifier_group.created', { actorId, targetId: entityId(group) });
    return toModifierGroupDTO(group, []);
  }

  async listGroups(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    if (query.status) filter.status = query.status;
    const page = await this.groups.paginateScoped(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? 'displayOrder',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'type'],
    });
    return this.paginated(page, (g) => toModifierGroupDTO(g, []));
  }

  async getGroup(tenant, id) {
    const group = await loadOwned(this.groups, tenant, id, CATALOG_ERRORS.MODIFIER_GROUP_NOT_FOUND);
    const scope = { organizationId: String(group.organizationId), restaurantId: String(group.restaurantId) };
    const modifiers = await this.modifiers.findByGroup(scope, id);
    return toModifierGroupDTO(group, modifiers);
  }

  async updateGroup(tenant, id, data, actorId = null) {
    const group = await loadOwned(this.groups, tenant, id, CATALOG_ERRORS.MODIFIER_GROUP_NOT_FOUND);
    const patch = {};
    for (const key of ['name', 'description', 'type', 'isRequired', 'minSelection', 'maxSelection', 'displayOrder', 'status']) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    this.#validateBounds({
      type: patch.type ?? group.type,
      isRequired: patch.isRequired ?? group.isRequired,
      minSelection: patch.minSelection ?? group.minSelection,
      maxSelection: patch.maxSelection ?? group.maxSelection,
    });
    const updated = await this.groups.updateById(id, patch);
    await this.events.publish(
      new ModifierGroupUpdatedEvent({ restaurantId: String(group.restaurantId), groupId: id, changes: Object.keys(patch) }),
    );
    this.audit.success('catalog.modifier_group.updated', { actorId, targetId: id });
    const scope = { organizationId: String(group.organizationId), restaurantId: String(group.restaurantId) };
    const modifiers = await this.modifiers.findByGroup(scope, id);
    return toModifierGroupDTO(updated, modifiers);
  }

  async deleteGroup(tenant, id, actorId = null) {
    const group = await loadOwned(this.groups, tenant, id, CATALOG_ERRORS.MODIFIER_GROUP_NOT_FOUND);
    const scope = { organizationId: String(group.organizationId), restaurantId: String(group.restaurantId) };
    await this.modifiers.softDeleteByGroup(scope, id);
    await this.groups.softDeleteById(id);
    await this.events.publish(
      new ModifierGroupDeletedEvent({ restaurantId: scope.restaurantId, groupId: id }),
    );
    this.audit.success('catalog.modifier_group.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }

  // --- modifiers within a group ---

  async addModifier(tenant, groupId, data, actorId = null) {
    const group = await loadOwned(this.groups, tenant, groupId, CATALOG_ERRORS.MODIFIER_GROUP_NOT_FOUND);
    const scope = { organizationId: String(group.organizationId), restaurantId: String(group.restaurantId) };
    const modifier = await this.modifiers.createScoped(scope, {
      groupId,
      name: data.name,
      price: data.price ?? 0,
      calories: data.calories ?? null,
      isDefault: data.isDefault ?? false,
      isAvailable: data.isAvailable ?? true,
      displayOrder: data.displayOrder ?? 0,
    });
    await this.events.publish(
      new ModifierAddedEvent({ restaurantId: scope.restaurantId, groupId, modifierId: entityId(modifier) }),
    );
    this.audit.success('catalog.modifier.added', { actorId, targetId: entityId(modifier) });
    return toModifierDTO(modifier);
  }

  async updateModifier(tenant, id, data, actorId = null) {
    const modifier = await loadOwned(this.modifiers, tenant, id, CATALOG_ERRORS.MODIFIER_NOT_FOUND);
    const patch = {};
    for (const key of ['name', 'price', 'calories', 'isDefault', 'isAvailable', 'displayOrder', 'status']) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    const updated = await this.modifiers.updateById(id, patch);
    await this.events.publish(
      new ModifierUpdatedEvent({ restaurantId: String(modifier.restaurantId), modifierId: id, changes: Object.keys(patch) }),
    );
    this.audit.success('catalog.modifier.updated', { actorId, targetId: id });
    return toModifierDTO(updated);
  }

  async removeModifier(tenant, id, actorId = null) {
    const modifier = await loadOwned(this.modifiers, tenant, id, CATALOG_ERRORS.MODIFIER_NOT_FOUND);
    await this.modifiers.softDeleteById(id);
    await this.events.publish(
      new ModifierRemovedEvent({
        restaurantId: String(modifier.restaurantId),
        groupId: String(modifier.groupId),
        modifierId: id,
      }),
    );
    this.audit.success('catalog.modifier.removed', { actorId, targetId: id });
    return { id, deleted: true };
  }
}

export const modifierService = new ModifierService();
export default modifierService;
