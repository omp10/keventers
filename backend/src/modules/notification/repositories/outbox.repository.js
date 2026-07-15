import { OUTBOX_STATUS } from '../constants/notification.constants.js';
import { NotificationOutbox } from '../models/notification-outbox.model.js';

import { NotificationScopedRepository } from './notification-scoped.repository.js';

/**
 * Outbox repository. `claim` atomically transitions a single PENDING row to
 * PROCESSING (findOneAndUpdate = safe across concurrent relay workers). `claimBatch`
 * pulls a batch of due rows for the sweeper. Terminal transitions record the
 * dispatch/dead-letter outcome + retry schedule.
 */
export class OutboxRepository extends NotificationScopedRepository {
  constructor(model = NotificationOutbox) {
    super(model, { softDelete: false });
  }

  findByDedupe(dedupeKey) {
    return this.findOne({ dedupeKey });
  }

  /** Atomically claim one specific outbox row (PENDING → PROCESSING). */
  async claim(id, now = new Date()) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, status: OUTBOX_STATUS.PENDING },
      { $set: { status: OUTBOX_STATUS.PROCESSING, lockedAt: now }, $inc: { attempts: 1 } },
      { new: true },
    );
    return this.toDomain(doc);
  }

  /** Claim up to `limit` due rows for the relay sweep (crash recovery). */
  async claimBatch(now = new Date(), limit = 200) {
    const due = await this.model
      .find({ status: OUTBOX_STATUS.PENDING, $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] })
      .sort({ createdAt: 1 })
      .limit(limit)
      .select('_id')
      .lean();
    const claimed = [];
    for (const row of due) {
      const c = await this.claim(row._id, now);
      if (c) claimed.push(c);
    }
    return claimed;
  }

  async markDispatched(id, now = new Date()) {
    const doc = await this.model.findByIdAndUpdate(id, { $set: { status: OUTBOX_STATUS.DISPATCHED, dispatchedAt: now, lastError: null } }, { new: true });
    return this.toDomain(doc);
  }

  /** Transient failure → back to PENDING with a backoff next-attempt time. */
  async reschedule(id, nextAttemptAt, error) {
    const doc = await this.model.findByIdAndUpdate(id, { $set: { status: OUTBOX_STATUS.PENDING, nextAttemptAt, lastError: error ?? null } }, { new: true });
    return this.toDomain(doc);
  }

  /** Permanent failure → dead-letter. */
  async markDead(id, error) {
    const doc = await this.model.findByIdAndUpdate(id, { $set: { status: OUTBOX_STATUS.DEAD, lastError: error ?? null } }, { new: true });
    return this.toDomain(doc);
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'eventName', 'category'] });
  }
}

export const outboxRepository = new OutboxRepository();
export default outboxRepository;
