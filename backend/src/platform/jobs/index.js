import { logger } from '#core/logging/logger.js';

import { startAllWorkers } from './base.worker.js';
import { closeQueues } from './queue.factory.js';

export { getQueue, buildQueueConnection, closeQueues, listQueues } from './queue.factory.js';
export { jobRegistry, JobRegistry } from './job-registry.js';
export { startWorker, startAllWorkers } from './base.worker.js';
export { Scheduler } from './scheduler.js';
export { RetryPolicies } from './retry-policies.js';

/**
 * Background-jobs lifecycle manager. The composition root starts workers after
 * modules have registered their jobs, and closes everything on shutdown.
 */
export class JobManager {
  #workers = [];

  start() {
    this.#workers = startAllWorkers();
    return this;
  }

  async stop() {
    await Promise.allSettled(this.#workers.map((w) => w.close()));
    await closeQueues();
    this.#workers = [];
    logger().info('Job workers & queues closed');
  }
}

export const jobManager = new JobManager();
export default jobManager;
