import { redisConnection } from '#core/redis/redis.connection.js';
import { logger } from '#core/logging/logger.js';

const NAMESPACE = 'cache:';

/**
 * General-purpose cache service over Redis. Business modules compose this; no
 * business caching is defined here.
 */
export class CacheService {
  /** @param {() => import('ioredis').Redis} [clientFactory] */
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #key(key) {
    return `${NAMESPACE}${key}`;
  }

  /** @returns {Promise<T|null>} @template T */
  async get(key) {
    const raw = await this.client.get(this.#key(key));
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  /** @param {number} [ttlSeconds] */
  async set(key, value, ttlSeconds) {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(this.#key(key), payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(this.#key(key), payload);
    }
  }

  async del(key) {
    return this.client.del(this.#key(key));
  }

  async has(key) {
    return (await this.client.exists(this.#key(key))) === 1;
  }

  /**
   * Cache-aside: return cached value or compute, store, and return it.
   * @template T
   * @param {string} key
   * @param {number} ttlSeconds
   * @param {() => Promise<T>} factory
   * @returns {Promise<T>}
   */
  async getOrSet(key, ttlSeconds, factory) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const value = await factory();
    if (value !== undefined && value !== null) {
      await this.set(key, value, ttlSeconds).catch((err) =>
        logger().warn({ err, key }, 'Cache set failed (continuing)'),
      );
    }
    return value;
  }
}

export const cacheService = new CacheService();
export default cacheService;
