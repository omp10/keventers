import { BaseService } from '#core/service/base.service.js';
import { config } from '#config';

import {
  OUTBOX_STATUS,
} from '../constants/notification.constants.js';
import { toOutboxDTO } from '../dto/notification.dto.js';
import { outboxRepository } from '../repositories/outbox.repository.js';
import { notificationRedisStore } from '../stores/notification-redis.store.js';
import { enqueueOutboxDispatch } from '../queue/dispatch.js';
import { entityId } from '../utils/id.util.js';
import { loadForStaff, resolveRestaurantScope } from '../utils/tenant.util.js';
import { NOTIFICATION_ERRORS } from '../constants/notification.constants.js';

import { notificationService } from './notification.service.js';

/**
 * Outbox service — the RELIABILITY core (transactional-outbox + relay). On a
 * consumed domain event the handler calls `enqueue` which durably persists ONE
 * outbox row (idempotent by dedupeKey) BEFORE any external work, then schedules a
 * dispatch job. The dispatch worker `claim`s the row (atomic PENDING→PROCESSING),
 * materializes notifications, and marks it DISPATCHED. Transient failures reschedule
 * with exponential backoff; permanent failures go DEAD. A periodic `sweep`
 * re-claims stale PENDING rows so nothing is lost if the app crashes between the
 * event and dispatch.
 */
export class OutboxService extends BaseService {
  constructor({
    outbox = outboxRepository,
    notifications = notificationService,
    store = notificationRedisStore,
    scheduleDispatch = enqueueOutboxDispatch,
    resolveScope = resolveRestaurantScope,
    deliveryConfig = config.notification.delivery,
    redisConfig = config.notification.redis,
    eventBus,
  } = {}) {
    super({ name: 'notification.outbox', eventBus });
    this.outbox = outbox;
    this.notifications = notifications;
    this.store = store;
    this.scheduleDispatch = scheduleDispatch;
    this.resolveScope = resolveScope;
    this.deliveryConfig = deliveryConfig;
    this.redisConfig = redisConfig;
  }

  /**
   * Persist a notification intent (outbox row) + schedule dispatch. Idempotent by
   * dedupeKey (Redis fast-path + unique index). Returns the outbox row (or the
   * existing one on replay). This is the PUBLIC entry the event handlers call.
   */
  async enqueueFromEvent(request) {
    const { scope, dedupeKey } = request;
    // Fast-path dedupe (durable unique index is the backstop).
    const fresh = await this.store.claimDedupe(dedupeKey, this.redisConfig.dedupeTtlSeconds);
    if (!fresh) {
      const existing = await this.outbox.findByDedupe(dedupeKey);
      if (existing) return existing;
    }
    let row;
    try {
      row = await this.outbox.createScoped(scope, {
        eventName: request.eventName,
        templateKey: request.templateKey,
        category: request.category,
        priority: request.priority,
        audience: request.audience,
        recipient: request.recipient ?? {},
        channels: request.channels ?? [],
        variables: request.variables ?? {},
        data: request.data ?? {},
        dedupeKey,
        scheduledAt: request.scheduledAt ?? null,
        status: OUTBOX_STATUS.PENDING,
      });
    } catch (err) {
      if (err?.code === 11000) return this.outbox.findByDedupe(dedupeKey); // replay
      throw err;
    }
    const delayMs = request.scheduledAt ? Math.max(0, new Date(request.scheduledAt).getTime() - Date.now()) : 0;
    await this.scheduleDispatch(entityId(row), { delayMs });
    return row;
  }

  /**
   * Dispatch one outbox row: claim → materialize notifications → mark DISPATCHED.
   * Transient failure → reschedule with backoff; final failure → DEAD.
   */
  async dispatch(outboxId) {
    const claimed = await this.outbox.claim(outboxId);
    if (!claimed) return { skipped: 'not_claimable' }; // already processing/dispatched
    try {
      await this.notifications.materializeFromOutbox(claimed);
      await this.outbox.markDispatched(entityId(claimed));
      return { dispatched: true };
    } catch (err) {
      const attempts = claimed.attempts ?? 1;
      if (attempts >= this.deliveryConfig.maxAttempts) {
        await this.outbox.markDead(entityId(claimed), err?.message ?? 'dispatch_failed');
        this.audit.failure('notification.outbox.dead_letter', { targetId: entityId(claimed), metadata: { error: err?.message } });
        return { dead: true };
      }
      const backoff = this.deliveryConfig.backoffMs * 2 ** (attempts - 1);
      await this.outbox.reschedule(entityId(claimed), new Date(Date.now() + backoff), err?.message ?? 'dispatch_failed');
      throw err; // let the queue retry too
    }
  }

  /** Relay sweep: re-claim stale PENDING rows and dispatch them (crash recovery). */
  async sweep(limit = this.deliveryConfig.relayBatchSize) {
    const rows = await this.outbox.claimBatch(new Date(), limit);
    let dispatched = 0;
    for (const row of rows) {
      try {
        await this.notifications.materializeFromOutbox(row);
        await this.outbox.markDispatched(entityId(row));
        dispatched += 1;
      } catch (err) {
        const attempts = row.attempts ?? 1;
        if (attempts >= this.deliveryConfig.maxAttempts) await this.outbox.markDead(entityId(row), err?.message);
        else await this.outbox.reschedule(entityId(row), new Date(Date.now() + this.deliveryConfig.backoffMs * 2 ** (attempts - 1)), err?.message);
      }
    }
    if (rows.length) this.logger.info({ claimed: rows.length, dispatched }, 'notification outbox relay sweep');
    return { claimed: rows.length, dispatched };
  }

  // ==================== STAFF / ADMIN ====================

  async listForStaff(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    for (const f of ['status', 'eventName', 'category']) if (query[f]) filter[f] = query[f];
    const page = await this.outbox.paginateForStaff(scope, { filter, sort: '-createdAt', pagination: { page: query.page, limit: query.limit } });
    return this.paginated(page, toOutboxDTO);
  }

  /** Requeue a dead-lettered outbox row for investigation/retry (admin). */
  async requeue(tenant, id, actorId = null) {
    const row = await loadForStaff(this.outbox, tenant, id, NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
    await this.outbox.reschedule(entityId(row), new Date(), null);
    await this.scheduleDispatch(entityId(row), {});
    this.audit.success('notification.outbox.requeued', { actorId, targetId: entityId(row) });
    return toOutboxDTO(await this.outbox.findById(entityId(row)));
  }
}

export const outboxService = new OutboxService();
export default outboxService;
