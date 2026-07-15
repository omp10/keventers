import { BaseService } from '#core/service/base.service.js';
import { ConflictError } from '#core/errors/app-error.js';

import { QR_ERRORS } from '../constants/qr.constants.js';
import { toTableGroupDTO } from '../dto/qr.dto.js';
import { tableGroupRepository } from '../repositories/table-group.repository.js';
import { tableRepository } from '../repositories/table.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned, requireBranch, resolveScope } from '../utils/tenant.util.js';

/**
 * Table group (floor / zone / section) management. Branch-scoped. Groups are
 * optional containers for tables. Tenant isolation is enforced by resolving the
 * scope from the tenant context and never trusting client-provided ids.
 */
export class TableGroupService extends BaseService {
  constructor({ groups = tableGroupRepository, tables = tableRepository, resolveScope: scopeResolver, eventBus } = {}) {
    super({ name: 'qr.table-group', eventBus });
    this.groups = groups;
    this.tables = tables;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  async createGroup(tenant, restaurantId, branchId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    requireBranch(scope);
    if (await this.groups.existsByName(scope, data.name)) {
      throw new ConflictError(QR_ERRORS.DUPLICATE_GROUP);
    }
    const group = await this.groups.createScoped(scope, {
      name: data.name,
      type: data.type,
      floor: data.floor ?? '',
      description: data.description ?? '',
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    });
    this.audit.success('qr.table_group.created', { actorId, targetId: entityId(group) });
    return toTableGroupDTO(group);
  }

  async listGroups(tenant, restaurantId, branchId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const filter = {};
    if (query.type) filter.type = query.type;
    const page = await this.groups.paginateScoped(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? 'displayOrder',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['type', 'isActive'],
    });
    return this.paginated(page, toTableGroupDTO);
  }

  async getGroup(tenant, id) {
    const group = await loadOwned(this.groups, tenant, id, QR_ERRORS.TABLE_GROUP_NOT_FOUND);
    return toTableGroupDTO(group);
  }

  async updateGroup(tenant, id, data, actorId = null) {
    const group = await loadOwned(this.groups, tenant, id, QR_ERRORS.TABLE_GROUP_NOT_FOUND);
    const patch = {};
    for (const key of ['name', 'type', 'floor', 'description', 'displayOrder', 'isActive']) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    const updated = await this.groups.updateById(id, patch);
    this.audit.success('qr.table_group.updated', { actorId, targetId: id });
    return toTableGroupDTO(updated);
  }

  async deleteGroup(tenant, id, actorId = null) {
    const group = await loadOwned(this.groups, tenant, id, QR_ERRORS.TABLE_GROUP_NOT_FOUND);
    const scope = {
      organizationId: String(group.organizationId),
      restaurantId: String(group.restaurantId),
      branchId: String(group.branchId),
    };
    const tableCount = await this.tables.countByGroup(scope, id);
    if (tableCount > 0) throw new ConflictError('Reassign or delete tables before deleting this group');
    await this.groups.softDeleteById(id);
    this.audit.success('qr.table_group.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }
}

export const tableGroupService = new TableGroupService();
export default tableGroupService;
