import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ConflictError } from '#core/errors/app-error.js';

import { QR_ERRORS, TABLE_STATUS } from '../constants/qr.constants.js';
import { toTableDTO } from '../dto/qr.dto.js';
import { TableStatusChangedEvent } from '../events/qr.events.js';
import { qrCodeRepository } from '../repositories/qr-code.repository.js';
import { tableGroupRepository } from '../repositories/table-group.repository.js';
import { tableRepository } from '../repositories/table.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned, requireBranch, resolveScope } from '../utils/tenant.util.js';

/**
 * Table management. Branch-scoped CRUD + operational status. Tenant isolation is
 * enforced by resolving the scope from the tenant context; client-provided ids
 * are never trusted. Deleting a table cascades to deactivate its QR codes.
 */
export class TableService extends BaseService {
  constructor({
    tables = tableRepository,
    groups = tableGroupRepository,
    qrCodes = qrCodeRepository,
    resolveScope: scopeResolver,
    eventBus,
  } = {}) {
    super({ name: 'qr.table', eventBus });
    this.tables = tables;
    this.groups = groups;
    this.qrCodes = qrCodes;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  async #validateGroup(scope, groupId) {
    if (!groupId) return;
    const group = await this.groups.findByIdScoped(scope, groupId);
    if (!group) throw new BadRequestError(QR_ERRORS.TABLE_GROUP_NOT_FOUND);
  }

  async createTable(tenant, restaurantId, branchId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    requireBranch(scope);
    if (await this.tables.existsByNumber(scope, data.number)) {
      throw new ConflictError(QR_ERRORS.DUPLICATE_TABLE_NUMBER);
    }
    await this.#validateGroup(scope, data.groupId);

    const table = await this.tables.createScoped(scope, {
      groupId: data.groupId ?? null,
      floor: data.floor ?? '',
      zone: data.zone ?? '',
      number: data.number,
      name: data.name ?? '',
      seatingCapacity: data.seatingCapacity ?? 2,
      shape: data.shape,
      status: data.status ?? TABLE_STATUS.AVAILABLE,
      isReserved: data.isReserved ?? false,
      isOrderingEnabled: data.isOrderingEnabled ?? true,
      displayOrder: data.displayOrder ?? 0,
    });
    this.audit.success('qr.table.created', { actorId, targetId: entityId(table) });
    return toTableDTO(table);
  }

  async listTables(tenant, restaurantId, branchId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.groupId) filter.groupId = query.groupId;
    if (query.isReserved !== undefined) filter.isReserved = query.isReserved;

    const page = await this.tables.paginateScoped(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? 'displayOrder',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'groupId', 'isReserved', 'isOrderingEnabled'],
    });
    return this.paginated(page, toTableDTO);
  }

  async getTable(tenant, id) {
    const table = await loadOwned(this.tables, tenant, id, QR_ERRORS.TABLE_NOT_FOUND);
    return toTableDTO(table);
  }

  async updateTable(tenant, id, data, actorId = null) {
    const table = await loadOwned(this.tables, tenant, id, QR_ERRORS.TABLE_NOT_FOUND);
    const scope = {
      organizationId: String(table.organizationId),
      restaurantId: String(table.restaurantId),
      branchId: String(table.branchId),
    };
    const patch = {};
    for (const key of [
      'groupId',
      'floor',
      'zone',
      'name',
      'seatingCapacity',
      'shape',
      'isReserved',
      'isOrderingEnabled',
      'displayOrder',
    ]) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if (data.number !== undefined && data.number !== table.number) {
      if (await this.tables.existsByNumber(scope, data.number)) {
        throw new ConflictError(QR_ERRORS.DUPLICATE_TABLE_NUMBER);
      }
      patch.number = data.number;
    }
    if (data.groupId !== undefined) await this.#validateGroup(scope, data.groupId);

    const updated = await this.tables.updateById(id, patch);
    this.audit.success('qr.table.updated', { actorId, targetId: id });
    return toTableDTO(updated);
  }

  /** Set operational status (AVAILABLE/RESERVED/CLEANING/OUT_OF_SERVICE …). */
  async setStatus(tenant, id, status, actorId = null) {
    const table = await loadOwned(this.tables, tenant, id, QR_ERRORS.TABLE_NOT_FOUND);
    const updated = await this.tables.updateById(id, { status });
    await this.events.publish(
      new TableStatusChangedEvent({
        tableId: id,
        branchId: String(table.branchId),
        from: table.status,
        to: status,
      }),
    );
    this.audit.success('qr.table.status_changed', { actorId, targetId: id, metadata: { status } });
    return toTableDTO(updated);
  }

  async deleteTable(tenant, id, actorId = null) {
    const table = await loadOwned(this.tables, tenant, id, QR_ERRORS.TABLE_NOT_FOUND);
    const scope = {
      organizationId: String(table.organizationId),
      restaurantId: String(table.restaurantId),
      branchId: String(table.branchId),
    };
    // Cascade: deactivate the table's QR codes so they can no longer be scanned.
    await this.qrCodes.deactivateForTable(scope, id);
    await this.tables.softDeleteById(id);
    this.audit.success('qr.table.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }
}

export const tableService = new TableService();
export default tableService;
