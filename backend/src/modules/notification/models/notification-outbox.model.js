import mongoose from 'mongoose';

import { OUTBOX_STATUS, PRIORITY } from '../constants/notification.constants.js';
import { baseSchemaOptions, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Notification OUTBOX — the transactional-outbox record. On every consumed
 * domain event the handler persists ONE outbox row (PENDING) BEFORE any external
 * provider call, capturing the intent + resolved recipient + template variables.
 * A relay worker then claims PENDING rows (atomic PENDING→PROCESSING), fans them
 * out into per-channel Notification docs + delivery jobs, and marks DISPATCHED.
 * Transient failures retry with backoff; permanent failures go DEAD (dead-letter)
 * for investigation. This guarantees no notification is lost if the app crashes
 * between the event and the provider call.
 */
const outboxSchema = new Schema(
  {
    ...tenantFields,

    eventName: { type: String, required: true },
    templateKey: { type: String, required: true },
    category: { type: String, required: true },
    priority: { type: String, enum: Object.values(PRIORITY), default: PRIORITY.NORMAL },
    audience: { type: String, default: 'customer' },

    // Resolved recipient descriptor (contact resolved lazily at dispatch).
    recipient: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
      sessionId: { type: String, default: null },
      email: { type: String, default: null },
      phone: { type: String, default: null },
      role: { type: String, default: null }, // for restaurant/admin fan-out
    },

    channels: [{ type: String }], // candidate channels (intersected with prefs)
    variables: { type: Schema.Types.Mixed, default: () => ({}) },
    data: { type: Schema.Types.Mixed, default: () => ({}) }, // deep-link payload

    dedupeKey: { type: String, required: true, unique: true },
    scheduledAt: { type: Date, default: null }, // delayed delivery

    status: { type: String, enum: Object.values(OUTBOX_STATUS), default: OUTBOX_STATUS.PENDING, index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    nextAttemptAt: { type: Date, default: null },
    dispatchedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null }, // claim marker for the relay
  },
  baseSchemaOptions,
);

// Relay scan: pending/retry rows due now, oldest first.
outboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
outboxSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });

export const NotificationOutbox =
  mongoose.models.NotificationOutbox || mongoose.model('NotificationOutbox', outboxSchema);

export default NotificationOutbox;
