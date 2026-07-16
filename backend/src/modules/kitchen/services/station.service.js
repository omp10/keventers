import { BaseService } from '#core/service/base.service.js';
import { ConflictError } from '#core/errors/app-error.js';

import { ACTIVE_KITCHEN_STATUSES, KITCHEN_ERRORS } from '../constants/kitchen.constants.js';
import { toStationDTO } from '../dto/kitchen.dto.js';
import { kitchenQueueRepository } from '../repositories/kitchen-queue.repository.js';
import { kitchenStationRepository } from '../repositories/kitchen-station.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned, resolveBranchScope } from '../utils/tenant.util.js';

/**
 * Kitchen station management (branch-scoped CRUD + routing config). Stations are
 * configurable per branch; products route to them via each station's routing
 * rules. Tenant isolation via the resolved branch scope.
 */
export class StationService extends BaseService {
  constructor({
    stations = kitchenStationRepository,
    queue = kitchenQueueRepository,
    resolveScope = resolveBranchScope,
    eventBus,
  } = {}) {
    super({ name: 'kitchen.station', eventBus });
    this.stations = stations;
    this.queue = queue;
    this.resolveScope = resolveScope;
  }

  async createStation(tenant, restaurantId, branchId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    if (!scope.branchId) throw new ConflictError(KITCHEN_ERRORS.CROSS_TENANT);
    if (await this.stations.existsByName(scope, data.name)) {
      throw new ConflictError(KITCHEN_ERRORS.DUPLICATE_STATION);
    }
    const station = await this.stations.createScoped(scope, {
      name: data.name,
      type: data.type,
      code: data.code ?? '',
      description: data.description ?? '',
      routing: data.routing ?? {},
      isActive: data.isActive ?? true,
      displayOrder: data.displayOrder ?? 0,
    });
    this.audit.success('kitchen.station.created', { actorId, targetId: entityId(station) });
    return toStationDTO(station);
  }

  async listStations(tenant, restaurantId, branchId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const filter = {};
    if (query.type) filter.type = query.type;
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    const page = await this.stations.paginateForBranch(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? 'displayOrder',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toStationDTO);
  }

  async getStation(tenant, id) {
    const station = await loadOwned(this.stations, tenant, id, KITCHEN_ERRORS.STATION_NOT_FOUND);
    return toStationDTO(station);
  }

  async updateStation(tenant, id, data, actorId = null) {
    await loadOwned(this.stations, tenant, id, KITCHEN_ERRORS.STATION_NOT_FOUND);
    const patch = {};
    for (const key of ['name', 'type', 'code', 'description', 'routing', 'isActive', 'displayOrder']) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    const updated = await this.stations.updateById(id, patch);
    this.audit.success('kitchen.station.updated', { actorId, targetId: id });
    return toStationDTO(updated);
  }

  async deleteStation(tenant, id, actorId = null) {
    const station = await loadOwned(this.stations, tenant, id, KITCHEN_ERRORS.STATION_NOT_FOUND);
    const active = await this.queue.countScoped(
      { organizationId: String(station.organizationId), restaurantId: String(station.restaurantId), branchId: String(station.branchId) },
      { stationIds: id, status: { $in: ACTIVE_KITCHEN_STATUSES } },
    );
    if (active > 0) throw new ConflictError(KITCHEN_ERRORS.STATION_HAS_ENTRIES);
    await this.stations.softDeleteById(id);
    this.audit.success('kitchen.station.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }
}

export const stationService = new StationService();
export default stationService;
