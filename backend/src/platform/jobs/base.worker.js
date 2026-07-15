import { Worker } from 'bullmq';

import { logger } from '#core/logging/logger.js';

import { buildQueueConnection } from './queue.factory.js';
import { jobRegistry } from './job-registry.js';

/**
 * Creates a BullMQ Worker for a job definition, with lifecycle logging. The
 * processor runs inside a fresh request context could be added later; kept
 * minimal here.
 *
 * @param {import('./job-registry.js').JobDefinition} definition
 * @returns {import('bullmq').Worker}
 */
export function startWorker(definition) {
  const worker = new Worker(
    definition.queue,
    async (job) => {
      logger().debug({ queue: definition.queue, jobId: job.id, name: job.name }, 'Job started');
      return definition.processor(job);
    },
    {
      connection: buildQueueConnection(),
      concurrency: definition.concurrency,
    },
  );

  worker.on('completed', (job) =>
    logger().debug({ queue: definition.queue, jobId: job.id }, 'Job completed'),
  );
  worker.on('failed', (job, err) =>
    logger().error(
      { queue: definition.queue, jobId: job?.id, attempts: job?.attemptsMade, err },
      'Job failed',
    ),
  );

  return worker;
}

/**
 * Start workers for every registered job definition.
 * @returns {import('bullmq').Worker[]}
 */
export function startAllWorkers() {
  const workers = jobRegistry.all().map((def) => startWorker(def));
  logger().info({ count: workers.length }, 'Job workers started');
  return workers;
}
