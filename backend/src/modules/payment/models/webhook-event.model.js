import mongoose from 'mongoose';

import { PROVIDER, WEBHOOK_STATUS } from '../constants/payment.constants.js';

const { Schema } = mongoose;

/**
 * WebhookEvent: the durable record for incoming gateway webhooks — the backstop
 * for IDEMPOTENCY + REPLAY protection (Redis provides the fast-path dedup; this
 * is the persistent guarantee). A unique (provider, eventId) index makes
 * duplicate delivery a no-op. Payloads stored are non-secret.
 */
const webhookEventSchema = new Schema(
  {
    provider: { type: String, enum: Object.values(PROVIDER), required: true },
    eventId: { type: String, required: true },
    eventType: { type: String, default: null },

    signatureValid: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(WEBHOOK_STATUS), default: WEBHOOK_STATUS.RECEIVED },

    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },

    receivedAt: { type: Date, default: () => new Date() },
    processedAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ createdAt: -1 });

export const WebhookEvent =
  mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);

export default WebhookEvent;
