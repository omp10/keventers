import { redisConnection } from '#core/redis/redis.connection.js';

import { REDIS_KEYS } from '../constants/cart.constants.js';

/**
 * Redis-backed idempotency store for cart mutations. A client sends an
 * `Idempotency-Key` header; the first successful application stores the response
 * under (cartId, key) so a retry (network glitch, double-tap) returns the SAME
 * result instead of applying the mutation twice. Keys are scoped per cart and
 * expire after a retention window.
 */
export class IdempotencyStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #key(cartId, key) {
    return `${REDIS_KEYS.IDEMPOTENCY}:${cartId}:${key}`;
  }

  async get(cartId, key) {
    if (!key) return null;
    const raw = await this.client.get(this.#key(cartId, key));
    return raw ? JSON.parse(raw) : null;
  }

  async set(cartId, key, result, ttlSeconds) {
    if (!key) return;
    await this.client.set(this.#key(cartId, key), JSON.stringify(result), 'EX', ttlSeconds);
  }
}

export const idempotencyStore = new IdempotencyStore();
export default idempotencyStore;
