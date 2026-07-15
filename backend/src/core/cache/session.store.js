import { redisConnection } from '#core/redis/redis.connection.js';

/**
 * Low-level Redis session storage primitive. Stores an opaque session record
 * keyed by session id, and maintains a per-user index set so all of a user's
 * sessions can be listed/revoked. The higher-level SessionService (auth
 * platform) composes this — no auth policy lives here.
 */
export class SessionStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  #sessionKey(id) {
    return `session:${id}`;
  }

  #userIndexKey(userId) {
    return `session-index:${userId}`;
  }

  /**
   * @param {string} sessionId
   * @param {object} data       Arbitrary serializable session data.
   * @param {number} ttlSeconds
   * @param {string} [userId]   When provided, indexes the session under the user.
   */
  async save(sessionId, data, ttlSeconds, userId) {
    const pipeline = this.client.pipeline();
    pipeline.set(this.#sessionKey(sessionId), JSON.stringify(data), 'EX', ttlSeconds);
    if (userId) {
      pipeline.sadd(this.#userIndexKey(userId), sessionId);
      pipeline.expire(this.#userIndexKey(userId), ttlSeconds);
    }
    await pipeline.exec();
  }

  async get(sessionId) {
    const raw = await this.client.get(this.#sessionKey(sessionId));
    return raw ? JSON.parse(raw) : null;
  }

  async touch(sessionId, ttlSeconds) {
    return this.client.expire(this.#sessionKey(sessionId), ttlSeconds);
  }

  async destroy(sessionId, userId) {
    const pipeline = this.client.pipeline();
    pipeline.del(this.#sessionKey(sessionId));
    if (userId) pipeline.srem(this.#userIndexKey(userId), sessionId);
    await pipeline.exec();
  }

  async listUserSessions(userId) {
    return this.client.smembers(this.#userIndexKey(userId));
  }

  async destroyAllForUser(userId) {
    const ids = await this.listUserSessions(userId);
    if (ids.length === 0) return 0;
    const pipeline = this.client.pipeline();
    for (const id of ids) pipeline.del(this.#sessionKey(id));
    pipeline.del(this.#userIndexKey(userId));
    await pipeline.exec();
    return ids.length;
  }
}

export const sessionStore = new SessionStore();
export default sessionStore;
