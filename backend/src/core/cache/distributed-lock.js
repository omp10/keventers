import { randomUUID } from 'node:crypto';

import { redisConnection } from '#core/redis/redis.connection.js';

// Atomic compare-and-delete: only the lock owner (matching token) may release.
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

/**
 * Redis-backed distributed lock (single-node Redlock-lite). Prevents concurrent
 * execution of a critical section across processes/instances — used later by
 * jobs, idempotent handlers, etc.
 */
export class DistributedLock {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  /**
   * Try to acquire a lock once.
   * @param {string} resource
   * @param {number} ttlMs
   * @returns {Promise<string|null>} A release token, or null if already held.
   */
  async acquire(resource, ttlMs = 10000) {
    const token = randomUUID();
    const ok = await this.client.set(`lock:${resource}`, token, 'PX', ttlMs, 'NX');
    return ok === 'OK' ? token : null;
  }

  /**
   * Acquire with bounded retries (spin-wait).
   * @returns {Promise<string|null>}
   */
  async acquireWithRetry(resource, { ttlMs = 10000, retries = 5, delayMs = 200 } = {}) {
    for (let i = 0; i <= retries; i += 1) {
      const token = await this.acquire(resource, ttlMs);
      if (token) return token;
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  }

  /** Release only if we still own the lock. */
  async release(resource, token) {
    const res = await this.client.eval(RELEASE_SCRIPT, 1, `lock:${resource}`, token);
    return res === 1;
  }

  /**
   * Run `fn` while holding the lock; always releases. Throws if the lock can't
   * be acquired.
   * @template T
   * @param {string} resource
   * @param {() => Promise<T>} fn
   * @param {object} [options]
   * @returns {Promise<T>}
   */
  async withLock(resource, fn, options = {}) {
    const token = await this.acquireWithRetry(resource, options);
    if (!token) throw new Error(`Could not acquire lock: ${resource}`);
    try {
      return await fn();
    } finally {
      await this.release(resource, token);
    }
  }
}

export const distributedLock = new DistributedLock();
export default distributedLock;
