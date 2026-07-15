import { redisConnection } from '#core/redis/redis.connection.js';

import { CACHE_TTL, PRIORITY_WEIGHT, REDIS_KEYS } from '../constants/kitchen.constants.js';

/**
 * Redis store for the live kitchen board. Holds a priority-ordered branch queue
 * (ZSET), per-station membership (SETs) and preparation timers (for SLA) — so
 * the board, station filters and SLA checks are O(log n)/O(1) and survive
 * high-frequency updates across many branches without hammering MongoDB (which
 * remains the durable source of truth). Best-effort: callers tolerate Redis
 * being unavailable (Mongo can rebuild the board).
 */
export class KitchenQueueStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #branchKey(branchId) {
    return `${REDIS_KEYS.BRANCH_QUEUE}:${branchId}`;
  }
  #stationKey(stationId) {
    return `${REDIS_KEYS.STATION_QUEUE}:${stationId}`;
  }
  #timerKey(entryId) {
    return `${REDIS_KEYS.PREP_TIMER}:${entryId}`;
  }

  /** Score orders the ZSET: higher priority first, then earlier queue time. */
  #score(priority, queuedAt) {
    const weight = PRIORITY_WEIGHT[priority] ?? 0;
    const millis = new Date(queuedAt).getTime();
    return weight * 1e13 - millis;
  }

  /** Add an entry to the branch board + its station sets. */
  async add(branchId, stationIds, entryId, { priority, queuedAt }) {
    const pipeline = this.client.pipeline();
    pipeline.zadd(this.#branchKey(branchId), this.#score(priority, queuedAt), entryId);
    pipeline.expire(this.#branchKey(branchId), CACHE_TTL.QUEUE_SECONDS);
    for (const s of stationIds ?? []) {
      pipeline.sadd(this.#stationKey(s), entryId);
      pipeline.expire(this.#stationKey(s), CACHE_TTL.QUEUE_SECONDS);
    }
    await pipeline.exec();
  }

  /** Remove an entry from the branch board + station sets (on terminal status). */
  async remove(branchId, stationIds, entryId) {
    const pipeline = this.client.pipeline();
    pipeline.zrem(this.#branchKey(branchId), entryId);
    for (const s of stationIds ?? []) pipeline.srem(this.#stationKey(s), entryId);
    pipeline.del(this.#timerKey(entryId));
    await pipeline.exec();
  }

  /** Priority-ordered active entry ids for a branch board. */
  async branchQueueIds(branchId, { limit = 200 } = {}) {
    return this.client.zrevrange(this.#branchKey(branchId), 0, limit - 1);
  }

  async branchQueueCount(branchId) {
    return this.client.zcard(this.#branchKey(branchId));
  }

  async stationQueueIds(stationId) {
    return this.client.smembers(this.#stationKey(stationId));
  }

  async setPrepTimer(entryId, data) {
    await this.client.set(this.#timerKey(entryId), JSON.stringify(data), 'EX', CACHE_TTL.TIMER_SECONDS);
  }

  async getPrepTimer(entryId) {
    const raw = await this.client.get(this.#timerKey(entryId));
    return raw ? JSON.parse(raw) : null;
  }

  async delPrepTimer(entryId) {
    return this.client.del(this.#timerKey(entryId));
  }
}

export const kitchenQueueStore = new KitchenQueueStore();
export default kitchenQueueStore;
