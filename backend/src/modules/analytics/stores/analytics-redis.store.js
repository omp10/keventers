import { cacheService } from '#core/cache/cache.service.js';

import { REDIS_KEYS } from '../constants/analytics.constants.js';

/**
 * Redis facade for analytics: dashboard/KPI/trending caches (invalidated on
 * projection updates) and a short-lived prep-time CORRELATION store (records the
 * `preparing` timestamp per order so the kitchen updater can compute prep
 * duration on `ready`, since events don't carry it). All best-effort: a Redis
 * outage degrades to a live projection read, never an error.
 */
export class AnalyticsRedisStore {
  constructor({ cache = cacheService } = {}) {
    this.cache = cache;
  }

  #safe(p, fb = null) {
    return Promise.resolve(p).catch(() => fb);
  }

  // --- dashboard / KPI widget cache ---
  kpiKey(restaurantId, widget) {
    return `${REDIS_KEYS.KPI}:${restaurantId}:${widget}`;
  }
  getKpi(restaurantId, widget) {
    return this.#safe(this.cache.get(this.kpiKey(restaurantId, widget)));
  }
  setKpi(restaurantId, widget, data, ttl) {
    return this.#safe(this.cache.set(this.kpiKey(restaurantId, widget), data, ttl));
  }

  /** Invalidate all cached widgets for a restaurant (best-effort pattern del). */
  async invalidateRestaurant(restaurantId) {
    const client = this.#client();
    if (!client?.keys) return;
    try {
      const keys = await client.keys(`cache:${REDIS_KEYS.KPI}:${restaurantId}:*`);
      if (keys?.length) await client.del(...keys);
    } catch {
      /* best-effort */
    }
  }

  #client() {
    try {
      return this.cache.client ?? null;
    } catch {
      return null;
    }
  }

  // --- prep-time correlation (preparing → ready) ---
  async recordPreparing(orderId, atMs, ttlSeconds) {
    return this.#safe(this.cache.set(`${REDIS_KEYS.PREP_CORR}:${orderId}`, atMs, ttlSeconds));
  }
  async takePreparing(orderId) {
    const v = await this.#safe(this.cache.get(`${REDIS_KEYS.PREP_CORR}:${orderId}`));
    return v == null ? null : Number(v);
  }

  // --- session-duration correlation (created → ended) ---
  async recordSessionStart(sessionId, atMs, ttlSeconds) {
    return this.#safe(this.cache.set(`${REDIS_KEYS.PREP_CORR}:sess:${sessionId}`, atMs, ttlSeconds));
  }
  async takeSessionStart(sessionId) {
    const v = await this.#safe(this.cache.get(`${REDIS_KEYS.PREP_CORR}:sess:${sessionId}`));
    return v == null ? null : Number(v);
  }
}

export const analyticsRedisStore = new AnalyticsRedisStore();
export default analyticsRedisStore;
