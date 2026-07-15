import { BaseService } from '#core/service/base.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '#core/errors/app-error.js';

import { IDENTITY_ERRORS } from '../constants/identity.constants.js';
import { toRoleDTO } from '../dto/identity.dto.js';
import { RoleCreatedEvent, RoleDeletedEvent, RoleUpdatedEvent } from '../events/identity.events.js';
import { permissionRepository } from '../repositories/permission.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import { normalizeNames } from '../utils/identity.utils.js';

/**
 * Role business logic (RBAC administration).
 */
export class RoleService extends BaseService {
  constructor({ roles = roleRepository, permissions = permissionRepository, eventBus } = {}) {
    super({ name: 'identity.role', eventBus });
    this.roles = roles;
    this.permissions = permissions;
  }

  async #getOrThrow(id) {
    const role = await this.roles.findById(id);
    if (!role) throw new NotFoundError(IDENTITY_ERRORS.ROLE_NOT_FOUND);
    return role;
  }

  async #assertPermissionsExist(names = []) {
    if (names.length === 0) return;
    const found = await this.permissions.findByNames(names);
    if (found.length !== new Set(names).size) {
      throw new ValidationError(IDENTITY_ERRORS.PERMISSION_NOT_FOUND);
    }
  }

  async createRole(data, actorId = null) {
    if (await this.roles.existsByName(data.name)) {
      throw new ConflictError(IDENTITY_ERRORS.ROLE_NAME_TAKEN);
    }
    const permissions = normalizeNames(data.permissions ?? []);
    await this.#assertPermissionsExist(permissions);

    const role = await this.roles.create({
      name: data.name,
      displayName: data.displayName ?? data.name,
      description: data.description ?? '',
      permissions,
      priority: data.priority ?? 0,
    });
    await this.events.publish(new RoleCreatedEvent({ roleId: role.id, name: role.name }));
    this.audit.success('identity.role.created', { actorId, targetId: role.id, metadata: { name: role.name } });
    return toRoleDTO(role);
  }

  async getRole(id) {
    return toRoleDTO(await this.#getOrThrow(id));
  }

  async listRoles(query = {}) {
    const page = await this.roles.paginate({
      search: query.search,
      sort: query.sort,
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toRoleDTO);
  }

  async updateRole(id, data, actorId = null) {
    const role = await this.#getOrThrow(id);
    if (role.isSystem) throw new ForbiddenError(IDENTITY_ERRORS.SYSTEM_ROLE_IMMUTABLE);
    const updated = await this.roles.updateById(id, data);
    await this.events.publish(new RoleUpdatedEvent({ roleId: id, changes: Object.keys(data) }));
    this.audit.success('identity.role.updated', { actorId, targetId: id });
    return toRoleDTO(updated);
  }

  async setPermissions(id, permissionNames, mode, actorId = null) {
    const role = await this.#getOrThrow(id);
    if (role.isSystem) throw new ForbiddenError(IDENTITY_ERRORS.SYSTEM_ROLE_IMMUTABLE);
    const names = normalizeNames(permissionNames);
    await this.#assertPermissionsExist(names);

    const current = role.permissions ?? [];
    const next =
      mode === 'remove'
        ? current.filter((p) => !names.includes(p))
        : normalizeNames([...current, ...names]);

    const updated = await this.roles.updateById(id, { permissions: next });
    await this.events.publish(new RoleUpdatedEvent({ roleId: id, permissionsMode: mode, permissions: names }));
    this.audit.success('identity.role.permissions_updated', {
      actorId,
      targetId: id,
      metadata: { mode, permissions: names },
    });
    return toRoleDTO(updated);
  }

  async deleteRole(id, actorId = null) {
    const role = await this.#getOrThrow(id);
    if (role.isSystem) throw new ForbiddenError(IDENTITY_ERRORS.SYSTEM_ROLE_IMMUTABLE);
    await this.roles.softDeleteById(id);
    await this.events.publish(new RoleDeletedEvent({ roleId: id, name: role.name }));
    this.audit.success('identity.role.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }
}

export const roleService = new RoleService();
export default roleService;
