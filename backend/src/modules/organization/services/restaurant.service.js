import { BaseService } from '#core/service/base.service.js';
import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';

import { ORG_ERRORS } from '../constants/organization.constants.js';
import { toRestaurantDTO } from '../dto/organization.dto.js';
import { RestaurantUpdatedEvent } from '../events/organization.events.js';
import { restaurantRepository } from '../repositories/restaurant.repository.js';
import { assertRestaurantAccess } from '../utils/tenant-context.js';
import { deepMerge } from '../utils/merge.util.js';
import { entityId } from '../utils/id.util.js';

/**
 * Restaurant profile & settings management, tenant-scoped. A restaurant is
 * resolved from the caller's tenant context (their primary restaurant) or an
 * explicit id that is access-checked — never from an unchecked request param.
 */
export class RestaurantService extends BaseService {
  constructor({ restaurants = restaurantRepository, eventBus } = {}) {
    super({ name: 'org.restaurant', eventBus });
    this.restaurants = restaurants;
  }

  /** Resolve a restaurant the tenant may access (defaults to primary). */
  async resolveForTenant(tenant, restaurantId) {
    const targetId = restaurantId ?? tenant?.primaryRestaurantId ?? (await this.#defaultRestaurantId(tenant));
    if (!targetId) throw new ForbiddenError(ORG_ERRORS.NO_RESTAURANT);
    const restaurant = await this.restaurants.findById(targetId);
    if (!restaurant) throw new NotFoundError(ORG_ERRORS.RESTAURANT_NOT_FOUND);
    assertRestaurantAccess(tenant, restaurant);
    return restaurant;
  }

  /**
   * An ORGANIZATION-scoped membership (an owner / org admin) carries no
   * restaurantId, so the tenant context has no `primaryRestaurantId` — yet such
   * a member reaches every restaurant in their org (see `assertRestaurantAccess`).
   * Without this fallback every restaurant-scoped read fails for owners unless
   * they pass an explicit id. Defaults to the org's oldest restaurant, which for
   * the single-restaurant case (the norm) is simply "theirs".
   */
  async #defaultRestaurantId(tenant) {
    const organizationId = tenant?.primaryOrganizationId;
    if (!organizationId) return null;
    const [restaurant] = await this.restaurants.find({ organizationId }, { limit: 1, sort: 'createdAt' });
    return restaurant ? entityId(restaurant) : null;
  }

  async getProfile(tenant, restaurantId) {
    return toRestaurantDTO(await this.resolveForTenant(tenant, restaurantId));
  }

  async updateProfile(tenant, restaurantId, data, actorId = null) {
    const restaurant = await this.resolveForTenant(tenant, restaurantId);
    const patch = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.type !== undefined) patch.type = data.type;
    if (data.cuisines !== undefined) patch.cuisines = data.cuisines;
    if (data.address !== undefined) patch.address = { ...(restaurant.address ?? {}), ...data.address };
    const updated = await this.restaurants.updateById(entityId(restaurant), patch);
    await this.events.publish(
      new RestaurantUpdatedEvent({ restaurantId: entityId(restaurant), changes: Object.keys(patch) }),
    );
    this.audit.success('restaurant.updated', { actorId, targetId: entityId(restaurant) });
    return toRestaurantDTO(updated);
  }

  async updateSettings(tenant, restaurantId, settings, actorId = null) {
    const restaurant = await this.resolveForTenant(tenant, restaurantId);
    const merged = deepMerge(restaurant.settings ?? {}, settings);
    const updated = await this.restaurants.updateById(entityId(restaurant), { settings: merged });
    await this.events.publish(
      new RestaurantUpdatedEvent({ restaurantId: entityId(restaurant), changes: ['settings'] }),
    );
    this.audit.success('restaurant.settings.updated', {
      actorId,
      targetId: entityId(restaurant),
      metadata: { keys: Object.keys(settings) },
    });
    return toRestaurantDTO(updated);
  }

  /**
   * Trusted read of a restaurant by id WITHOUT a tenant check. For internal
   * server flows that have already authorized access by other means (e.g. the
   * QR Ordering gateway validating a signed QR token bound to this restaurant).
   * Never expose this directly on a tenant-scoped endpoint.
   */
  async getPublicProfile(restaurantId) {
    const restaurant = await this.restaurants.findById(restaurantId);
    return restaurant ? toRestaurantDTO(restaurant) : null;
  }

  /**
   * The restaurant's loyalty earning rule, with safe defaults when unset. Read by
   * the loyalty engine on payment capture. Never throws — a missing restaurant or
   * missing config yields the default per-amount rule so earning still works.
   */
  async getLoyaltyConfig(restaurantId) {
    const defaults = { enabled: true, mode: 'per_amount', pointsPerCurrencyUnit: 1, pointsPerOrder: 10 };
    const restaurant = await this.restaurants.findById(restaurantId).catch(() => null);
    const l = restaurant?.settings?.loyalty;
    return l ? { ...defaults, ...(l.toObject ? l.toObject() : l) } : defaults;
  }

  /** Trusted BATCH read — one query per page of rows. Returns a Map by id. */
  async getPublicByIds(ids = []) {
    const unique = [...new Set(ids.map(String).filter(Boolean))];
    if (!unique.length) return new Map();
    const rows = await this.restaurants.find({ _id: { $in: unique } }, { limit: unique.length });
    return new Map(rows.map((r) => [String(r.id ?? r._id), toRestaurantDTO(r)]));
  }

  async listForOrganization(organizationId, query = {}) {
    const page = await this.restaurants.paginate({
      filter: { organizationId },
      search: query.search,
      sort: query.sort,
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toRestaurantDTO);
  }
}

export const restaurantService = new RestaurantService();
export default restaurantService;
