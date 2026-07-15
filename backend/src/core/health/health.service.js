import { mongoConnection } from '#core/database/mongoose.connection.js';
import { redisConnection } from '#core/redis/redis.connection.js';

/**
 * Aggregates dependency health. Used by:
 *  - /health  → liveness  (is the process up?)
 *  - /ready   → readiness (are dependencies usable, i.e. can we serve traffic?)
 */
class HealthService {
  #startedAt = Date.now();

  /** Liveness: the process itself is running. Cheap, no I/O. */
  liveness() {
    return {
      status: 'up',
      uptimeSeconds: Math.floor((Date.now() - this.#startedAt) / 1000),
    };
  }

  async #check(name, probe) {
    const start = Date.now();
    try {
      const ok = await probe();
      return { name, status: ok ? 'up' : 'down', latencyMs: Date.now() - start };
    } catch (err) {
      return { name, status: 'down', latencyMs: Date.now() - start, error: err.message };
    }
  }

  /** Readiness: verify server + MongoDB + Redis. */
  async readiness() {
    const checks = await Promise.all([
      this.#check('server', () => true),
      this.#check('mongodb', () => mongoConnection.ping()),
      this.#check('redis', () => redisConnection.ping()),
    ]);

    const healthy = checks.every((c) => c.status === 'up');
    return {
      status: healthy ? 'ready' : 'not-ready',
      checks,
    };
  }
}

export const healthService = new HealthService();
export default healthService;
