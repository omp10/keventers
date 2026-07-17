import { redisConnection } from '#core/redis/redis.connection.js';
import { logger } from '#core/logging/logger.js';

/**
 * Cache invalidation helpers: direct key deletion, prefix/pattern deletion via
 * non-blocking SCAN, and tag-based invalidation (a tag is a Redis set of keys).
 */
export class CacheInvalidation {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  async invalidateKey(key) {
    return this.client.del(`cache:${key}`);
  }

  /**
   * Delete all keys matching a glob pattern using SCAN (never KEYS, which
   * blocks the server). Pattern is applied within the cache namespace.
   *
   * KEY-PREFIX HANDLING (do not simplify): ioredis applies `keyPrefix` to KEY
   * ARGUMENTS only. SCAN's MATCH is a pattern, not a key, so it is NOT
   * prefixed — the pattern must carry the prefix itself or it matches nothing.
   * Conversely SCAN *returns* fully-qualified keys, while `del` re-applies the
   * prefix, so the prefix must be stripped back off before deleting or every
   * delete targets a double-prefixed key that doesn't exist.
   *
   * Both halves failing silently is why this looked like it worked: SCAN found
   * nothing and reported 0 deleted.
   */
  async invalidateByPattern(pattern) {
    const client = this.client;
    const prefix = client.options?.keyPrefix ?? '';
    const match = `${prefix}cache:${pattern}`;
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', match, 'COUNT', 200);
      cursor = next;
      if (keys.length > 0) {
        const unprefixed = prefix ? keys.map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k)) : keys;
        deleted += await client.del(...unprefixed);
      }
    } while (cursor !== '0');
    logger().debug({ pattern, match, deleted }, 'Cache invalidated by pattern');
    return deleted;
  }

  /** Associate a cache key with one or more tags for grouped invalidation. */
  async tag(key, tags = []) {
    if (tags.length === 0) return;
    const pipeline = this.client.pipeline();
    for (const t of tags) pipeline.sadd(`cache-tag:${t}`, `cache:${key}`);
    await pipeline.exec();
  }

  /** Invalidate every key associated with a tag, then drop the tag set. */
  async invalidateTag(tag) {
    const setKey = `cache-tag:${tag}`;
    const keys = await this.client.smembers(setKey);
    if (keys.length > 0) await this.client.del(...keys);
    await this.client.del(setKey);
    return keys.length;
  }
}

export const cacheInvalidation = new CacheInvalidation();
export default cacheInvalidation;
