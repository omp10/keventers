import mongoose from 'mongoose';

import { CHANNEL, DELIVERY_STATUS } from '../constants/notification.constants.js';
import { tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Delivery attempt — an immutable record of ONE provider send attempt for a
 * notification. Captures provider, attempt number, the (non-secret) provider
 * response, failure reason and timestamp. Append-only: a retry adds a new row.
 * This is the audit trail for delivery reliability + reconciliation.
 */
const attemptSchema = new Schema(
  {
    ...tenantFields,
    notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },

    channel: { type: String, enum: Object.values(CHANNEL), required: true },
    provider: { type: String, required: true },
    attemptNumber: { type: Number, required: true },

    status: { type: String, enum: Object.values(DELIVERY_STATUS), required: true },
    providerMessageId: { type: String, default: null },
    response: { type: Schema.Types.Mixed, default: null }, // non-secret provider response
    failureReason: { type: String, default: null },
    durationMs: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

attemptSchema.index({ notificationId: 1, attemptNumber: 1 });
attemptSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });

export const DeliveryAttempt =
  mongoose.models.DeliveryAttempt || mongoose.model('DeliveryAttempt', attemptSchema);

export default DeliveryAttempt;
