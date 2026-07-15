import { redisConnection } from '#core/redis/redis.connection.js';

import { REDIS_KEYS } from '../constants/cart.constants.js';

/**
 * Redis cache for the active cart. Serves cart reads without a MongoDB hit and
 * drives inactivity-based expiration via a sliding TTL (refreshed on every
 * mutation/read). MongoDB remains the durable store; this is a fast mirror.
 */
export class CartCacheStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #key(cartId) {
    return `${REDIS_KEYS.CART_CACHE}:${cartId}`;
  }

  async save(cartId, snapshot, ttlSeconds) {
    await this.client.set(this.#key(cartId), JSON.stringify(snapshot), 'EX', ttlSeconds);
  }

  async get(cartId) {
    const raw = await this.client.get(this.#key(cartId));
    return raw ? JSON.parse(raw) : null;
  }

  async touch(cartId, ttlSeconds) {
    return this.client.expire(this.#key(cartId), ttlSeconds);
  }

  async del(cartId) {
    return this.client.del(this.#key(cartId));
  }
}

export const cartCacheStore = new CartCacheStore();
export default cartCacheStore;
