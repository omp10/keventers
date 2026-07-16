import { Queue } from 'bullmq';

import { config } from '#config';
import { logger } from '#core/logging/logger.js';

import { jobRegistry } from './job-registry.js';

/**
 * Builds and caches BullMQ Queue instances. BullMQ manages its own Redis
 * connections (it requires `maxRetriesPerRequest: null`), so we derive a
 * dedicated connection descriptor from config rather than reusing the shared
 * app client.
 */
export function buildQueueConnection() {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    maxRetriesPerRequest: null,
  };
}

const queues = new Map();

/** BullMQ reserves colons for its Redis key format. */
export function toBullQueueName(name) {
  return name.replaceAll(':', '-');
}

/**
 * Get (or lazily create) a queue by name.
 * @param {string} name
 * @returns {import('bullmq').Queue}
 */
export function getQueue(name) {
  if (!queues.has(name)) {
    // Apply the queue's REGISTERED retry/backoff policy as its default job
    // options, so a module's `jobRegistry.register(queue, fn, { jobOptions })`
    // (e.g. notification delivery attempts=5) actually takes effect instead of
    // silently falling back to the global default. Per-job options at enqueue
    // time still override these.
    const registered = jobRegistry.get(name)?.jobOptions ?? {};
    const queue = new Queue(toBullQueueName(name), {
      connection: buildQueueConnection(),
      prefix: config.jobs.prefix,
      defaultJobOptions: { ...config.jobs.defaultJobOptions, ...registered },
    });
    queues.set(name, queue);
    logger().debug({ queue: name }, 'Queue created');
  }
  return queues.get(name);
}

export function listQueues() {
  return [...queues.keys()];
}

/** Close every open queue (graceful shutdown). */
export async function closeQueues() {
  await Promise.allSettled([...queues.values()].map((q) => q.close()));
  queues.clear();
}
