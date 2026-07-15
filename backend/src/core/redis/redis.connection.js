import Redis from 'ioredis';

import { config } from '#config';
import { logger } from '#core/logging/logger.js';

/**
 * Owns the single Redis client for the process (caching, rate-limit stores,
 * future event-bus transport, etc.). Opened explicitly from the composition
 * root so startup can fail fast if Redis is unreachable.
 */
class RedisConnection {
  /** @type {import('ioredis').Redis | null} */
  #client = null;

  async connect() {
    if (this.#client) return this.#client;

    // Spread the frozen config so ioredis can merge its own defaults on it.
    this.#client = new Redis({ ...config.redis });

    this.#client.on('error', (err) => logger().error({ err }, 'Redis client error'));
    this.#client.on('connect', () => logger().info('Redis connected'));
    this.#client.on('reconnecting', () => logger().warn('Redis reconnecting'));
    this.#client.on('close', () => logger().warn('Redis connection closed'));

    // lazyConnect is true in config → open the socket now and await readiness.
    await this.#client.connect();
    return this.#client;
  }

  getClient() {
    if (!this.#client) throw new Error('Redis client not initialized. Call connect() first.');
    return this.#client;
  }

  isReady() {
    return this.#client?.status === 'ready';
  }

  /** PING used by the readiness probe. */
  async ping() {
    if (!this.#client) return false;
    const pong = await this.#client.ping();
    return pong === 'PONG';
  }

  async disconnect() {
    if (!this.#client) return;
    // Graceful: let in-flight commands finish, then close.
    await this.#client.quit();
    this.#client = null;
    logger().info('Redis connection closed');
  }
}

export const redisConnection = new RedisConnection();
export default redisConnection;
