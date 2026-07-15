import { redisConnection } from '#core/redis/redis.connection.js';

import { CACHE_TTL, REDIS_KEYS } from '../constants/order.constants.js';

/**
 * Redis idempotency store for checkout. Prevents duplicate order creation from
 * retries / double-taps: the first checkout for a session+key stores its result
 * and a retry replays it. Combined with the per-cart unique index and the
 * per-session checkout lock, this makes order creation safe under poor networks.
 */
export class IdempotencyStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #key(sessionId, key) {
    return `${REDIS_KEYS.IDEMPOTENCY}:${sessionId}:${key}`;
  }

  async get(sessionId, key) {
    if (!key) return null;
    const raw = await this.client.get(this.#key(sessionId, key));
    return raw ? JSON.parse(raw) : null;
  }

  async set(sessionId, key, result, ttlSeconds = CACHE_TTL.IDEMPOTENCY_SECONDS) {
    if (!key) return;
    await this.client.set(this.#key(sessionId, key), JSON.stringify(result), 'EX', ttlSeconds);
  }
}

export const idempotencyStore = new IdempotencyStore();
export default idempotencyStore;
