import { redisConnection } from '#core/redis/redis.connection.js';

import { CACHE_TTL, REDIS_KEYS } from '../constants/qr.constants.js';

/**
 * Redis cache for QR validation. Caches the NON-SENSITIVE resolved QR record
 * (ids + status + expiry — never the signing secret) keyed by public token, so
 * millions of scans of an unchanged QR are served without a MongoDB read. The
 * signature is still verified cryptographically on every scan; this cache only
 * skips the entity lookup. Invalidated when a QR is regenerated/rotated/toggled.
 */
export class QrValidationCache {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #key(token) {
    return `${REDIS_KEYS.QR_VALIDATION}:${token}`;
  }

  async get(token) {
    const raw = await this.client.get(this.#key(token));
    return raw ? JSON.parse(raw) : null;
  }

  async set(token, record, ttlSeconds = CACHE_TTL.QR_VALIDATION_SECONDS) {
    await this.client.set(this.#key(token), JSON.stringify(record), 'EX', ttlSeconds);
  }

  async del(token) {
    if (!token) return 0;
    return this.client.del(this.#key(token));
  }
}

export const qrValidationCache = new QrValidationCache();
export default qrValidationCache;
