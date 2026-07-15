import { CHANNEL, NOTIFICATION_STATUS } from '../constants/notification.constants.js';
import { Notification } from '../models/notification.model.js';

import { NotificationScopedRepository } from './notification-scoped.repository.js';

/**
 * Notification repository. Powers the in-app inbox (by user/session), delivery
 * history, and optimistic status transitions. The unique (dedupeKey, channel)
 * index is the idempotency backstop for event→notification fan-out.
 */
export class NotificationRepository extends NotificationScopedRepository {
  constructor(model = Notification) {
    super(model, { softDelete: false, searchableFields: ['subject', 'body'] });
  }

  findByDedupeChannel(dedupeKey, channel) {
    return this.findOne({ dedupeKey, channel });
  }

  /** In-app inbox for a recipient (linked user OR anonymous session). */
  paginateInbox({ userId = null, sessionId = null }, params = {}) {
    const recipient = userId ? { userId } : { sessionId };
    return this.paginate({
      ...params,
      filter: { ...recipient, channel: CHANNEL.IN_APP },
      allowedFilterFields: ['status', 'category', 'userId', 'sessionId', 'channel'],
      sort: params.sort ?? '-createdAt',
    });
  }

  countUnread({ userId = null, sessionId = null }) {
    const recipient = userId ? { userId } : { sessionId };
    return this.count({ ...recipient, channel: CHANNEL.IN_APP, status: { $ne: NOTIFICATION_STATUS.READ } });
  }

  /** Bulk mark-as-read for a recipient's unread in-app notifications. */
  async markAllRead({ userId = null, sessionId = null }) {
    const recipient = userId ? { userId } : { sessionId };
    const res = await this.model.updateMany(
      { ...recipient, channel: CHANNEL.IN_APP, status: { $ne: NOTIFICATION_STATUS.READ } },
      { $set: { status: NOTIFICATION_STATUS.READ, readAt: new Date() } },
    );
    return { updated: res?.modifiedCount ?? 0 };
  }

  /** Optimistic status transition + timestamp set. */
  async transition(id, expectedVersion, status, extraSet = {}) {
    return this.updateWithVersion(id, expectedVersion, { status, ...extraSet });
  }

  /** Notifications stuck in QUEUED past the scheduled time (relay/crash recovery). */
  findStuckQueued(before, limit = 200) {
    return this.find(
      { status: NOTIFICATION_STATUS.QUEUED, $or: [{ scheduledAt: null }, { scheduledAt: { $lte: before } }] },
      { sort: 'createdAt', limit },
    );
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'category', 'channel', 'audience'] });
  }
}

export const notificationRepository = new NotificationRepository();
export default notificationRepository;
