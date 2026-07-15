import { cacheService } from '#core/cache/cache.service.js';

import { REDIS_KEYS } from '../constants/notification.constants.js';

/**
 * Redis facade for the Notification Engine: event DEDUPLICATION (fast-path before
 * the DB unique index), per-recipient RATE LIMITING, and per-notification
 * DELIVERY LOCKS. All best-effort — a Redis outage degrades to the durable
 * MongoDB guards (unique dedupe index, optimistic status), never an error.
 */
export class NotificationRedisStore {
  constructor({ cache = cacheService } = {}) {
    this.cache = cache;
  }

  #client() {
    try {
      return this.cache.client ?? null;
    } catch {
      return null; // Redis not connected → callers degrade to DB guards
    }
  }

  #safe(promise, fallback = null) {
    return Promise.resolve(promise).catch(() => fallback);
  }

  /** Claim a dedupe key (SET NX). Returns true if newly claimed, false if seen. */
  async claimDedupe(dedupeKey, ttlSeconds) {
    const client = this.#client();
    if (!client?.set) return true; // no redis → rely on the DB unique index
    const key = `${REDIS_KEYS.DEDUPE}:${dedupeKey}`;
    const res = await this.#safe(client.set(key, '1', 'EX', ttlSeconds, 'NX'), 'OK');
    return res === 'OK';
  }

  /** Fixed-window rate limit per (recipient, category). Returns true if allowed. */
  async allowRate(recipientKey, category, perMinute) {
    const client = this.#client();
    if (!client?.incr) return true;
    const key = `${REDIS_KEYS.RATE}:${recipientKey}:${category}`;
    const n = await this.#safe(client.incr(key), 0);
    if (n === 1) await this.#safe(client.expire(key, 60));
    return n <= perMinute;
  }

  /** Per-notification delivery lock (SET NX PX). Returns true if acquired. */
  async acquireDeliveryLock(notificationId, ttlMs) {
    const client = this.#client();
    if (!client?.set) return true;
    const key = `${REDIS_KEYS.DELIVERY_LOCK}:${notificationId}`;
    const res = await this.#safe(client.set(key, '1', 'PX', ttlMs, 'NX'), 'OK');
    return res === 'OK';
  }

  async releaseDeliveryLock(notificationId) {
    const client = this.#client();
    if (!client?.del) return;
    await this.#safe(client.del(`${REDIS_KEYS.DELIVERY_LOCK}:${notificationId}`));
  }
}

export const notificationRedisStore = new NotificationRedisStore();
export default notificationRedisStore;
