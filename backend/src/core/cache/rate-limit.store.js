import { redisConnection } from '#core/redis/redis.connection.js';

/**
 * Fixed-window rate-limit store backed by Redis. Reusable primitive; the actual
 * rate-limit MIDDLEWARE (wiring limits to routes) is composed by consumers.
 * The INCR + EXPIRE are performed in a single atomic Lua script so a crash can
 * never leave a key without a TTL (which would rate-limit an identifier forever);
 * the script also self-heals any TTL-less key it encounters.
 */
const HIT_SCRIPT = `
local c = redis.call('INCR', KEYS[1])
local t = redis.call('TTL', KEYS[1])
if t < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  t = tonumber(ARGV[1])
end
return {c, t}`;

export class RateLimitStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  /**
   * Register a hit against `identifier` within a fixed window.
   * @param {string} identifier  e.g. `ip:1.2.3.4:login`
   * @param {number} windowSeconds
   * @param {number} max          Allowed hits per window.
   * @returns {Promise<{ allowed: boolean, count: number, remaining: number, resetSeconds: number }>}
   */
  async hit(identifier, windowSeconds, max) {
    const key = `ratelimit:${identifier}`;
    const [count, ttl] = await this.client.eval(HIT_SCRIPT, 1, key, windowSeconds);

    return {
      allowed: count <= max,
      count,
      remaining: Math.max(max - count, 0),
      resetSeconds: ttl,
    };
  }

  async reset(identifier) {
    return this.client.del(`ratelimit:${identifier}`);
  }
}

export const rateLimitStore = new RateLimitStore();
export default rateLimitStore;
