import { config } from '#config';
import { logger } from '#core/logging/logger.js';
import { jobRegistry, Scheduler } from '#platform/jobs/index.js';

import { JOB_NAMES, QUEUES } from '../constants/notification.constants.js';
import { deliveryService } from '../services/delivery.service.js';
import { outboxService } from '../services/outbox.service.js';

import { enqueueDeadLetter } from './dispatch.js';

/**
 * Registers the Notification Engine's BullMQ job DEFINITIONS (pure — no Redis
 * I/O) and, best-effort, schedules the repeatable outbox RELAY sweep. Three
 * queues: OUTBOX (dispatch + relay), DELIVERY (per-notification send with
 * exponential-backoff retry) and DEAD_LETTER (parked permanently-failed jobs for
 * inspection). The composition root starts the workers after modules register.
 */
export function registerNotificationJobs({ registry = jobRegistry, delivery = deliveryService, outbox = outboxService } = {}) {
  // Wire the delivery service's dead-letter sink now that queues exist.
  delivery.deadLetter = enqueueDeadLetter;

  const d = config.notification.delivery;

  // OUTBOX queue: dispatch a specific row OR run the relay sweep.
  registry.register(
    QUEUES.OUTBOX,
    async (job) => {
      if (job.name === JOB_NAMES.RELAY_SWEEP) return outbox.sweep(d.relayBatchSize);
      return outbox.dispatch(job.data.outboxId);
    },
    { jobOptions: { attempts: 3, backoff: { type: 'exponential', delay: d.backoffMs } }, concurrency: d.concurrency },
  );

  // DELIVERY queue: send one notification. BullMQ owns retry/backoff; the
  // processor passes attemptsMade so the service can dead-letter on the final try.
  registry.register(
    QUEUES.DELIVERY,
    async (job) => delivery.process(job.data.notificationId, { attemptsMade: job.attemptsMade ?? 0 }),
    { jobOptions: { attempts: d.maxAttempts, backoff: { type: 'exponential', delay: d.backoffMs } }, concurrency: d.concurrency },
  );

  // DEAD_LETTER queue: inert holder — jobs are retained for admin inspection.
  registry.register(QUEUES.DEAD_LETTER, async (job) => ({ parked: job.id }), { jobOptions: { attempts: 1 }, concurrency: 1 });

  logger().info('Notification jobs registered');
}

/** Best-effort scheduling of the repeatable relay sweep (touches Redis). */
export async function scheduleNotificationRecurring() {
  try {
    await Scheduler.schedule(QUEUES.OUTBOX, JOB_NAMES.RELAY_SWEEP, {}, config.notification.delivery.relayCron);
    logger().info({ cron: config.notification.delivery.relayCron }, 'Notification relay sweep scheduled');
  } catch (err) {
    logger().warn({ err }, 'scheduling notification relay failed (will retry on next boot)');
  }
}
