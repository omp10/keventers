import { Worker } from 'bullmq';

import { config } from '#config';
import { logger } from '#core/logging/logger.js';

import { buildQueueConnection, toBullQueueName } from './queue.factory.js';
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
    toBullQueueName(definition.queue),
    async (job) => {
      logger().debug({ queue: definition.queue, jobId: job.id, name: job.name }, 'Job started');
      return definition.processor(job);
    },
    {
      connection: buildQueueConnection(),
      // MUST match the prefix the Queue writes under (queue.factory.js), or the
      // worker listens on BullMQ's default `bull` keyspace while producers
      // enqueue into `keventers:jobs` — jobs pile up as "waiting" forever and
      // nothing ever runs: no notification delivery, no outbox relay, no
      // analytics rebuild. Silent, because both halves look healthy alone.
      prefix: config.jobs.prefix,
      concurrency: definition.concurrency,
    },
  );

  // Without this, a Redis/connection failure is emitted as an unhandled 'error'
  // and the worker sits mute — which is how the prefix mismatch above stayed
  // invisible. Never let a dead worker look like an idle one.
  worker.on('error', (err) => logger().error({ queue: definition.queue, err }, 'Job worker error'));

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
