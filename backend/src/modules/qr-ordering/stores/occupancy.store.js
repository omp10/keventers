import { redisConnection } from '#core/redis/redis.connection.js';

import { CACHE_TTL, REDIS_KEYS } from '../constants/qr.constants.js';

/**
 * Redis store for table occupancy. Tracks the set of LIVE session ids currently
 * holding each table, plus a small status snapshot for fast reads. A table is
 * "occupied" while its session set is non-empty; releasing the last session
 * frees it. Kept in Redis so occupancy is O(1) and survives many concurrent
 * scans without hammering MongoDB (the Table doc is a best-effort mirror).
 */
export class OccupancyStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #sessionsKey(tableId) {
    return `${REDIS_KEYS.TABLE_SESSIONS}:${tableId}`;
  }

  #statusKey(tableId) {
    return `${REDIS_KEYS.TABLE_OCCUPANCY}:${tableId}`;
  }

  /** Attach a session to a table; returns the resulting live-session count. */
  async addSession(tableId, sessionId, ttlSeconds = CACHE_TTL.OCCUPANCY_SECONDS) {
    const key = this.#sessionsKey(tableId);
    const results = await this.client.multi().sadd(key, sessionId).expire(key, ttlSeconds).scard(key).exec();
    return results[2][1];
  }

  /** Detach a session; returns the remaining live-session count. */
  async removeSession(tableId, sessionId) {
    const key = this.#sessionsKey(tableId);
    const results = await this.client.multi().srem(key, sessionId).scard(key).exec();
    return results[1][1];
  }

  async countSessions(tableId) {
    return this.client.scard(this.#sessionsKey(tableId));
  }

  async listSessions(tableId) {
    return this.client.smembers(this.#sessionsKey(tableId));
  }

  async setStatus(tableId, snapshot, ttlSeconds = CACHE_TTL.OCCUPANCY_SECONDS) {
    await this.client.set(this.#statusKey(tableId), JSON.stringify(snapshot), 'EX', ttlSeconds);
  }

  async getStatus(tableId) {
    const raw = await this.client.get(this.#statusKey(tableId));
    return raw ? JSON.parse(raw) : null;
  }

  /** Fully clear a table's occupancy (force release). */
  async clear(tableId) {
    await this.client.del(this.#sessionsKey(tableId), this.#statusKey(tableId));
  }
}

export const occupancyStore = new OccupancyStore();
export default occupancyStore;
