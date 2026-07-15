import { redisConnection } from '#core/redis/redis.connection.js';

import { REDIS_KEYS } from '../constants/qr.constants.js';

/**
 * Redis store for LIVE guest sessions. Holds a compact snapshot of the active
 * session keyed by sessionId with a TTL (idle timeout), so the hot path
 * (validate token → read session) never touches MongoDB. The durable session
 * history lives in the GuestSession collection. Distinct key namespace
 * (`qr:session:`) from the platform auth SessionStore, so the two never collide.
 */
export class GuestSessionStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #key(sessionId) {
    return `${REDIS_KEYS.SESSION}:${sessionId}`;
  }

  /** @param {number} ttlSeconds  Idle-timeout TTL (refreshed on activity). */
  async save(sessionId, snapshot, ttlSeconds) {
    await this.client.set(this.#key(sessionId), JSON.stringify(snapshot), 'EX', ttlSeconds);
  }

  async get(sessionId) {
    const raw = await this.client.get(this.#key(sessionId));
    return raw ? JSON.parse(raw) : null;
  }

  /** Refresh the idle TTL (sliding expiration). */
  async touch(sessionId, ttlSeconds) {
    return this.client.expire(this.#key(sessionId), ttlSeconds);
  }

  async exists(sessionId) {
    return (await this.client.exists(this.#key(sessionId))) === 1;
  }

  async destroy(sessionId) {
    return this.client.del(this.#key(sessionId));
  }
}

export const guestSessionStore = new GuestSessionStore();
export default guestSessionStore;
