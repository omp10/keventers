import { config } from '#config';
import { logger } from '#core/logging/logger.js';
import { Scheduler } from '#platform/jobs/index.js';

import { JOB_NAMES, QUEUES } from '../constants/notification.constants.js';

/**
 * Thin enqueue helpers over the BullMQ Scheduler. Best-effort: if the queue
 * (Redis) is unavailable the durable outbox relay sweep is the safety net, so a
 * failed enqueue is logged, not thrown — the notification is never lost.
 */

const delivery = () => config.notification.delivery;

function deliveryJobOptions() {
  return { attempts: delivery().maxAttempts, backoff: { type: 'exponential', delay: delivery().backoffMs }, removeOnComplete: 1000, removeOnFail: 5000 };
}

/** Enqueue an outbox row for immediate dispatch (fast path). */
export async function enqueueOutboxDispatch(outboxId, { delayMs = 0 } = {}) {
  try {
    if (delayMs > 0) return await Scheduler.enqueueDelayed(QUEUES.OUTBOX, JOB_NAMES.DISPATCH_OUTBOX, { outboxId: String(outboxId) }, delayMs);
    return await Scheduler.enqueue(QUEUES.OUTBOX, JOB_NAMES.DISPATCH_OUTBOX, { outboxId: String(outboxId) });
  } catch (err) {
    logger().warn({ err, outboxId: String(outboxId) }, 'enqueue outbox dispatch failed (relay will retry)');
    return null;
  }
}

/** Enqueue a single notification for delivery (optionally delayed/scheduled). */
export async function enqueueDelivery(notificationId, { delayMs = 0 } = {}) {
  try {
    const data = { notificationId: String(notificationId) };
    if (delayMs > 0) return await Scheduler.enqueueDelayed(QUEUES.DELIVERY, JOB_NAMES.DELIVER, data, delayMs, deliveryJobOptions());
    return await Scheduler.enqueue(QUEUES.DELIVERY, JOB_NAMES.DELIVER, data, deliveryJobOptions());
  } catch (err) {
    logger().warn({ err, notificationId: String(notificationId) }, 'enqueue delivery failed (relay will retry)');
    return null;
  }
}

/** Park a permanently-failed delivery job in the dead-letter queue for inspection. */
export async function enqueueDeadLetter(payload) {
  try {
    return await Scheduler.enqueue(QUEUES.DEAD_LETTER, 'dead', payload, { attempts: 1, removeOnComplete: false });
  } catch (err) {
    logger().warn({ err }, 'enqueue dead-letter failed');
    return null;
  }
}
