import { cacheService } from '#core/cache/cache.service.js';
import { config } from '#config';
import { branchService, restaurantService } from '#modules/organization/index.js';

import { oid } from './id.util.js';

/**
 * Resolves an org+restaurant(+branch) scope from a bare restaurantId/branchId —
 * needed because several domain events (payment, loyalty, notification, QR)
 * carry only a partial tenant fragment. Results are CACHED (org/restaurant/branch
 * mappings are effectively immutable + low cardinality), so high-frequency events
 * (e.g. QR scans) don't hammer the org module. This is a trusted READ seam used
 * only for projection enrichment — never for dashboard generation.
 */
export class ScopeResolver {
  constructor({ restaurants = restaurantService, branches = branchService, cache = cacheService, ttl = config.analytics.scopeCacheTtlSeconds } = {}) {
    this.restaurants = restaurants;
    this.branches = branches;
    this.cache = cache;
    this.ttl = ttl;
  }

  #safeCacheGet(key) {
    return Promise.resolve(this.cache.get(key)).catch(() => null);
  }

  #safeCacheSet(key, val) {
    return Promise.resolve(this.cache.set(key, val, this.ttl)).catch(() => {});
  }

  /** { organizationId, restaurantId } from a restaurantId (null if unresolved). */
  async fromRestaurant(restaurantId) {
    if (!restaurantId) return null;
    const key = `analytics:scope:rest:${restaurantId}`;
    const cached = await this.#safeCacheGet(key);
    if (cached) return cached;
    const r = await this.restaurants.getPublicProfile(restaurantId).catch(() => null);
    if (!r?.organizationId) return null;
    const scope = { organizationId: oid(r.organizationId), restaurantId: String(restaurantId) };
    await this.#safeCacheSet(key, scope);
    return scope;
  }

  /** { organizationId, restaurantId, branchId } from a branchId (null if unresolved). */
  async fromBranch(branchId) {
    if (!branchId) return null;
    const key = `analytics:scope:branch:${branchId}`;
    const cached = await this.#safeCacheGet(key);
    if (cached) return cached;
    const b = await this.branches.getPublicById(branchId).catch(() => null);
    if (!b?.organizationId || !b?.restaurantId) return null;
    const scope = { organizationId: oid(b.organizationId), restaurantId: oid(b.restaurantId), branchId: String(branchId) };
    await this.#safeCacheSet(key, scope);
    return scope;
  }
}

export const scopeResolver = new ScopeResolver();
export default scopeResolver;
