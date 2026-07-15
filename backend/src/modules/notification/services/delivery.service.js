import { BaseService } from '#core/service/base.service.js';
import { config } from '#config';
import { notificationService as channelDispatcher } from '#platform/notification/index.js';

import {
  CHANNEL,
  DELIVERY_STATUS,
  NOTIFICATION_STATUS,
} from '../constants/notification.constants.js';
import {
  NotificationDeliveredEvent,
  NotificationFailedEvent,
  NotificationSentEvent,
} from '../events/notification.events.js';
import { deliveryAttemptRepository } from '../repositories/delivery-attempt.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { notificationRedisStore } from '../stores/notification-redis.store.js';
import { entityId } from '../utils/id.util.js';

import { notificationRealtimeService } from './notification-realtime.service.js';

/**
 * Delivery worker service. Sends ONE notification through the platform channel
 * DISPATCHER (which routes to the configured provider adapter — this service
 * never references a concrete provider), records an immutable DeliveryAttempt,
 * and advances the notification status. Idempotent + locked: a notification that
 * is already terminal is skipped. Transient failures THROW so BullMQ retries
 * with exponential backoff; on the final attempt the notification is marked
 * FAILED and dead-lettered.
 */
export class DeliveryService extends BaseService {
  constructor({
    notifications = notificationRepository,
    attempts = deliveryAttemptRepository,
    dispatcher = channelDispatcher,
    realtime = notificationRealtimeService,
    store = notificationRedisStore,
    deadLetter = null, // injected enqueueDeadLetter (avoids a queue import cycle)
    maxAttempts = config.notification.delivery.maxAttempts,
    lockTtlMs = config.notification.redis.lockTtlMs,
    eventBus,
  } = {}) {
    super({ name: 'notification.delivery', eventBus });
    this.notifications = notifications;
    this.attempts = attempts;
    this.dispatcher = dispatcher;
    this.realtime = realtime;
    this.store = store;
    this.deadLetter = deadLetter;
    this.maxAttempts = maxAttempts;
    this.lockTtlMs = lockTtlMs;
  }

  #scopeOf(n) {
    return { organizationId: String(n.organizationId), restaurantId: String(n.restaurantId), branchId: n.branchId ? String(n.branchId) : null };
  }

  /**
   * Process a delivery job.
   * @param {string} notificationId
   * @param {{ attemptsMade?: number }} job  BullMQ retry context (0-based tries so far)
   */
  async process(notificationId, { attemptsMade = 0 } = {}) {
    const locked = await this.store.acquireDeliveryLock(notificationId, this.lockTtlMs);
    if (!locked) return { skipped: 'locked' };
    try {
      const n = await this.notifications.findById(notificationId);
      if (!n) return { skipped: 'not_found' };
      if ([NOTIFICATION_STATUS.DELIVERED, NOTIFICATION_STATUS.READ, NOTIFICATION_STATUS.CANCELLED].includes(n.status)) {
        return { skipped: n.status };
      }
      return await this.#deliver(n, attemptsMade);
    } finally {
      await this.store.releaseDeliveryLock(notificationId);
    }
  }

  async #deliver(n, attemptsMade) {
    const id = entityId(n);
    const scope = this.#scopeOf(n);
    const attemptNumber = (n.attemptCount ?? 0) + 1;
    await this.notifications.updateById(id, { status: NOTIFICATION_STATUS.PROCESSING, attemptCount: attemptNumber });

    const message = { to: n.destination ?? undefined, subject: n.subject ?? undefined, body: n.body ?? '', data: { ...(n.data ?? {}), notificationId: id } };
    const started = Date.now();
    let result;
    try {
      result = await this.dispatcher.send(n.channel, message);
    } catch (err) {
      result = { success: false, error: err?.message ?? 'dispatch_threw' };
    }
    const durationMs = Date.now() - started;

    await this.attempts.createScoped(scope, {
      notificationId: id,
      channel: n.channel,
      provider: result?.provider ?? n.provider ?? n.channel,
      attemptNumber,
      status: result?.success ? DELIVERY_STATUS.SUCCESS : DELIVERY_STATUS.FAILED,
      providerMessageId: result?.providerMessageId ?? null,
      response: result?.response ?? null,
      failureReason: result?.success ? null : (result?.error ?? 'unknown'),
      durationMs,
    });

    if (result?.success) return this.#onSuccess(n, result);
    return this.#onFailure(n, result, attemptsMade);
  }

  async #onSuccess(n, result) {
    const id = entityId(n);
    const now = new Date();
    // In-app is delivered on send; external channels are SENT (delivery receipts
    // may later promote them to DELIVERED via provider webhooks — future).
    const isInApp = n.channel === CHANNEL.IN_APP;
    const status = isInApp ? NOTIFICATION_STATUS.DELIVERED : NOTIFICATION_STATUS.SENT;
    const updated = await this.notifications.updateById(id, {
      status,
      provider: result.provider ?? n.provider,
      providerMessageId: result.providerMessageId ?? null,
      sentAt: now,
      deliveredAt: isInApp ? now : null,
      failureReason: null,
    });
    await this.events.publish(new NotificationSentEvent(this.#eventBase(updated)));
    if (isInApp) {
      this.realtime.emitNew(updated);
      await this.events.publish(new NotificationDeliveredEvent(this.#eventBase(updated)));
    }
    return { delivered: true, status };
  }

  async #onFailure(n, result, attemptsMade) {
    const id = entityId(n);
    const reason = result?.error ?? 'delivery_failed';
    const isFinal = attemptsMade + 1 >= this.maxAttempts;
    if (!isFinal) {
      // Leave status PROCESSING; throw so BullMQ retries with backoff.
      throw new Error(`notification_delivery_retry: ${reason}`);
    }
    const updated = await this.notifications.updateById(id, { status: NOTIFICATION_STATUS.FAILED, failureReason: reason, failedAt: new Date() });
    await this.events.publish(new NotificationFailedEvent({ ...this.#eventBase(updated), reason }));
    if (this.deadLetter) await this.deadLetter({ notificationId: id, channel: n.channel, reason, restaurantId: String(n.restaurantId) }).catch(() => {});
    this.audit.failure('notification.delivery.dead_letter', { targetId: id, metadata: { channel: n.channel, reason } });
    return { delivered: false, deadLettered: true };
  }

  #eventBase(n) {
    return {
      notificationId: entityId(n),
      channel: n.channel,
      category: n.category,
      status: n.status,
      restaurantId: String(n.restaurantId),
      userId: n.userId ? String(n.userId) : null,
    };
  }
}

export const deliveryService = new DeliveryService();
export default deliveryService;
