import mongoose from 'mongoose';

import {
  CATEGORY,
  CHANNEL,
  NOTIFICATION_STATUS,
  PRIORITY,
} from '../constants/notification.constants.js';
import { baseSchemaOptions, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Notification — one channel-specific notification instance. Doubles as the
 * user-facing HISTORY and the IN-APP inbox record. A single business event may
 * produce several Notification docs (one per resolved channel). Status walks the
 * lifecycle QUEUED→PROCESSING→SENT→DELIVERED→READ (or FAILED/CANCELLED). The
 * unique `dedupeKey` makes event→notification idempotent.
 */
const notificationSchema = new Schema(
  {
    ...tenantFields,

    // Recipient (one of user / customer / session; role for staff/admin fan-out).
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    sessionId: { type: String, default: null, index: true },
    audience: { type: String, default: 'customer' },

    channel: { type: String, enum: Object.values(CHANNEL), required: true },
    category: { type: String, enum: Object.values(CATEGORY), required: true },
    priority: { type: String, enum: Object.values(PRIORITY), default: PRIORITY.NORMAL },

    templateKey: { type: String, default: null },
    locale: { type: String, default: 'en' },

    // Rendered content snapshot (immutable once sent).
    subject: { type: String, default: null },
    body: { type: String, default: '' },
    data: { type: Schema.Types.Mixed, default: () => ({}) }, // deep-link payload, order id, etc.

    // Resolved destination for external channels (email/phone/token) — non-secret.
    destination: { type: String, default: null },

    status: { type: String, enum: Object.values(NOTIFICATION_STATUS), default: NOTIFICATION_STATUS.QUEUED, index: true },
    provider: { type: String, default: null },
    providerMessageId: { type: String, default: null },
    failureReason: { type: String, default: null },
    attemptCount: { type: Number, default: 0 },

    // Correlation to the source event + outbox record.
    eventName: { type: String, default: null },
    outboxId: { type: Schema.Types.ObjectId, ref: 'NotificationOutbox', default: null },
    dedupeKey: { type: String, required: true },

    scheduledAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },

    version: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

// Idempotency: one notification per (dedupeKey, channel).
notificationSchema.index({ dedupeKey: 1, channel: 1 }, { unique: true });
// In-app inbox (by user / session), newest first + unread filter.
notificationSchema.index({ userId: 1, channel: 1, status: 1, createdAt: -1 });
notificationSchema.index({ sessionId: 1, channel: 1, createdAt: -1 });
// Delivery history + reporting.
notificationSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ restaurantId: 1, category: 1, createdAt: -1 });
// Scheduled/queued sweep.
notificationSchema.index({ status: 1, scheduledAt: 1 });

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
