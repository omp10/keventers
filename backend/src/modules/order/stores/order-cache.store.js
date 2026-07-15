import { redisConnection } from '#core/redis/redis.connection.js';

import { CACHE_TTL, REDIS_KEYS } from '../constants/order.constants.js';

/**
 * Redis cache for realtime order reads + status propagation. Holds the latest
 * order snapshot keyed by order id so hot status polls / realtime consumers
 * don't hit MongoDB. Refreshed on every transition; MongoDB stays the durable
 * source of truth.
 */
export class OrderCacheStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #key(orderId) {
    return `${REDIS_KEYS.ORDER_CACHE}:${orderId}`;
  }

  async save(orderId, snapshot, ttlSeconds = CACHE_TTL.ORDER_SECONDS) {
    await this.client.set(this.#key(orderId), JSON.stringify(snapshot), 'EX', ttlSeconds);
  }

  async get(orderId) {
    const raw = await this.client.get(this.#key(orderId));
    return raw ? JSON.parse(raw) : null;
  }

  async del(orderId) {
    return this.client.del(this.#key(orderId));
  }
}

export const orderCacheStore = new OrderCacheStore();
export default orderCacheStore;
