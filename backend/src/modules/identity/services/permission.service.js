import { BaseService } from '#core/service/base.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '#core/errors/app-error.js';

import { IDENTITY_ERRORS } from '../constants/identity.constants.js';
import { toPermissionDTO } from '../dto/identity.dto.js';
import { permissionRepository } from '../repositories/permission.repository.js';

/**
 * Permission catalog business logic.
 */
export class PermissionService extends BaseService {
  constructor({ permissions = permissionRepository, eventBus } = {}) {
    super({ name: 'identity.permission', eventBus });
    this.permissions = permissions;
  }

  async createPermission(data, actorId = null) {
    const name = `${data.resource}:${data.action}`.toLowerCase();
    if (await this.permissions.existsByName(name)) {
      throw new ConflictError(IDENTITY_ERRORS.PERMISSION_NAME_TAKEN);
    }
    const permission = await this.permissions.create({
      name,
      resource: data.resource,
      action: data.action,
      description: data.description ?? '',
    });
    this.audit.success('identity.permission.created', {
      actorId,
      targetId: permission.id,
      metadata: { name },
    });
    return toPermissionDTO(permission);
  }

  async getPermission(id) {
    const permission = await this.permissions.findById(id);
    if (!permission) throw new NotFoundError(IDENTITY_ERRORS.PERMISSION_NOT_FOUND);
    return toPermissionDTO(permission);
  }

  async listPermissions(query = {}) {
    const page = await this.permissions.paginate({
      search: query.search,
      sort: query.sort,
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toPermissionDTO);
  }

  async updatePermission(id, data, actorId = null) {
    const permission = await this.permissions.findById(id);
    if (!permission) throw new NotFoundError(IDENTITY_ERRORS.PERMISSION_NOT_FOUND);
    if (permission.isSystem) throw new ForbiddenError(IDENTITY_ERRORS.SYSTEM_ROLE_IMMUTABLE);
    const updated = await this.permissions.updateById(id, data);
    this.audit.success('identity.permission.updated', { actorId, targetId: id });
    return toPermissionDTO(updated);
  }

  async deletePermission(id, actorId = null) {
    const permission = await this.permissions.findById(id);
    if (!permission) throw new NotFoundError(IDENTITY_ERRORS.PERMISSION_NOT_FOUND);
    if (permission.isSystem) throw new ForbiddenError(IDENTITY_ERRORS.SYSTEM_ROLE_IMMUTABLE);
    await this.permissions.softDeleteById(id);
    this.audit.success('identity.permission.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }
}

export const permissionService = new PermissionService();
export default permissionService;
