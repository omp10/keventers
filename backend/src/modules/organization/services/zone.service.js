import { BaseService } from '#core/service/base.service.js';
import { NotFoundError } from '#core/errors/app-error.js';

import { zoneRepository } from '../repositories/zone.repository.js';
import { entityId } from '../utils/id.util.js';

/** Public DTO — flattens the GeoJSON center into the {lat,lng} the client uses. */
export function toZoneDTO(zone) {
  const [lng, lat] = zone.center?.coordinates ?? [];
  return {
    id: entityId(zone),
    name: zone.name,
    code: zone.code || undefined,
    city: zone.city || undefined,
    type: zone.type,
    center: { lat, lng },
    radiusKm: zone.radiusKm,
    etaMinutes: zone.etaMinutes ?? undefined,
    sortOrder: zone.sortOrder ?? 0,
  };
}

/** Admin DTO — adds economics + lifecycle. */
export function toZoneAdminDTO(zone) {
  return {
    ...toZoneDTO(zone),
    description: zone.description || '',
    deliveryFee: zone.deliveryFee ?? 0,
    minOrderAmount: zone.minOrderAmount ?? 0,
    status: zone.status,
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
  };
}

/** {lat,lng} → GeoJSON Point. Zones are authored as pins, stored as geo. */
const toPoint = (center) =>
  center && Number.isFinite(center.lat) && Number.isFinite(center.lng)
    ? { type: 'Point', coordinates: [center.lng, center.lat] }
    : undefined;

/**
 * Operating-zone management — ADMIN-DEFINED delivery/service coverage circles.
 * The backend stays authoritative for serviceability; this owns the data.
 */
export class ZoneService extends BaseService {
  constructor({ zones = zoneRepository, eventBus } = {}) {
    super({ name: 'org.zone', eventBus });
    this.zones = zones;
  }

  async #getOrThrow(id) {
    const zone = await this.zones.findById(id);
    if (!zone) throw new NotFoundError('Zone not found');
    return zone;
  }

  /** PUBLIC: active zones (optionally by city). */
  async listLive(query = {}) {
    const zones = await this.zones.findLive({ city: query.city });
    return zones.map(toZoneDTO);
  }

  /** ADMIN: paginated list (any status). */
  async list(query = {}) {
    const page = await this.zones.paginate({
      filter: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.city ? { city: query.city } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      search: query.search,
      sort: query.sort ?? 'sortOrder',
      pagination: { page: query.page, limit: query.limit },
    });
    return { items: page.items.map(toZoneAdminDTO), meta: page.meta };
  }

  async create(data, actorId = null) {
    const zone = await this.zones.create({
      ...data,
      center: toPoint(data.center),
      createdBy: actorId,
    });
    this.audit.success('zone.created', { actorId, targetId: entityId(zone) });
    return toZoneAdminDTO(zone);
  }

  async update(id, data, actorId = null) {
    await this.#getOrThrow(id);
    const patch = { ...data };
    if (data.center) patch.center = toPoint(data.center);
    const zone = await this.zones.updateById(id, patch);
    this.audit.success('zone.updated', { actorId, targetId: id });
    return toZoneAdminDTO(zone);
  }

  async remove(id, actorId = null) {
    await this.#getOrThrow(id);
    await this.zones.deleteById(id);
    this.audit.success('zone.deleted', { actorId, targetId: id });
    return { id };
  }
}

export const zoneService = new ZoneService();
export default zoneService;
