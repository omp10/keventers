import { cacheService } from '#core/cache/cache.service.js';

import { REDIS_KEYS } from '../constants/customer.constants.js';

/**
 * Customer caching facade over the core CacheService. Caches frequently-read,
 * expensive-to-assemble reads (profile, loyalty summary, active reward catalog).
 * Every cache is TTL-bounded AND explicitly invalidated by domain-event handlers,
 * so a stale read window never outlives a mutation. Cache is best-effort: a Redis
 * outage degrades to a DB read, never an error.
 */
export class CustomerRedisStore {
  constructor({ cache = cacheService } = {}) {
    this.cache = cache;
  }

  #safe(promise, fallback = null) {
    return Promise.resolve(promise).catch(() => fallback);
  }

  // --- profile ---
  profileKey(customerId) {
    return `${REDIS_KEYS.PROFILE}:${customerId}`;
  }
  getProfile(customerId) {
    return this.#safe(this.cache.get(this.profileKey(customerId)));
  }
  setProfile(customerId, dto, ttlSeconds) {
    return this.#safe(this.cache.set(this.profileKey(customerId), dto, ttlSeconds));
  }
  invalidateProfile(customerId) {
    return this.#safe(this.cache.del(this.profileKey(customerId)));
  }

  // --- loyalty summary ---
  loyaltyKey(customerId) {
    return `${REDIS_KEYS.LOYALTY}:${customerId}`;
  }
  getLoyalty(customerId) {
    return this.#safe(this.cache.get(this.loyaltyKey(customerId)));
  }
  setLoyalty(customerId, dto, ttlSeconds) {
    return this.#safe(this.cache.set(this.loyaltyKey(customerId), dto, ttlSeconds));
  }
  invalidateLoyalty(customerId) {
    return this.#safe(this.cache.del(this.loyaltyKey(customerId)));
  }

  // --- active reward catalog (per restaurant) ---
  rewardsKey(restaurantId) {
    return `${REDIS_KEYS.REWARDS}:${restaurantId}`;
  }
  getRewards(restaurantId) {
    return this.#safe(this.cache.get(this.rewardsKey(restaurantId)));
  }
  setRewards(restaurantId, dtos, ttlSeconds) {
    return this.#safe(this.cache.set(this.rewardsKey(restaurantId), dtos, ttlSeconds));
  }
  invalidateRewards(restaurantId) {
    return this.#safe(this.cache.del(this.rewardsKey(restaurantId)));
  }
}

export const customerRedisStore = new CustomerRedisStore();
export default customerRedisStore;
