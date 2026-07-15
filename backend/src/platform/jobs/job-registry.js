import { logger } from '#core/logging/logger.js';

import { RetryPolicies } from './retry-policies.js';

/**
 * Registry of job definitions. A definition binds a queue name to a processor
 * function plus default options (retry policy, concurrency). Modules register
 * their jobs at boot; the worker bootstrap materializes a Worker per queue.
 * No business jobs are registered by the platform.
 *
 * @typedef {object} JobDefinition
 * @property {string} queue
 * @property {(job: import('bullmq').Job) => Promise<unknown>} processor
 * @property {object} [jobOptions]
 * @property {number} [concurrency]
 */
export class JobRegistry {
  /** @type {Map<string, JobDefinition>} */
  #definitions = new Map();

  /**
   * @param {string} queue
   * @param {(job: import('bullmq').Job) => Promise<unknown>} processor
   * @param {object} [options]
   * @param {object} [options.jobOptions] Defaults to the standard retry policy.
   * @param {number} [options.concurrency]
   */
  register(queue, processor, { jobOptions = RetryPolicies.standard(), concurrency = 1 } = {}) {
    if (this.#definitions.has(queue)) {
      throw new Error(`Job already registered for queue "${queue}"`);
    }
    this.#definitions.set(queue, { queue, processor, jobOptions, concurrency });
    logger().debug({ queue }, 'Job registered');
    return this;
  }

  get(queue) {
    return this.#definitions.get(queue) ?? null;
  }

  all() {
    return [...this.#definitions.values()];
  }
}

export const jobRegistry = new JobRegistry();
export default jobRegistry;
