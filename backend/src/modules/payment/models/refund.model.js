import mongoose from 'mongoose';

import { PROVIDER, REFUND_STATUS } from '../constants/payment.constants.js';
import { baseSchemaOptions, moneyField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

const refundTimelineSchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    status: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, default: '' },
  },
  { _id: false },
);

/**
 * Refund: a full or partial refund of a captured payment. Execution belongs to
 * the provider (via the adapter); this record tracks the lifecycle
 * (requested → approved → processing → completed/failed) and enforces that total
 * refunds never exceed the captured amount. Integer minor units. Optimistically
 * versioned.
 */
const refundSchema = new Schema(
  {
    ...tenantFields,
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },

    amount: moneyField(0),
    currency: { type: String, default: 'INR' },
    isPartial: { type: Boolean, default: false },

    provider: { type: String, enum: Object.values(PROVIDER), default: null },
    providerRefundRef: { type: String, default: null, index: true },

    status: { type: String, enum: Object.values(REFUND_STATUS), default: REFUND_STATUS.REQUESTED, index: true },
    reason: { type: String, default: '' },
    failureReason: { type: String, default: null },

    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    idempotencyKey: { type: String, default: null },

    timeline: { type: [refundTimelineSchema], default: [] },
    completedAt: { type: Date, default: null },
    version: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  baseSchemaOptions,
);

refundSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
refundSchema.index({ paymentId: 1, status: 1 });
refundSchema.index({ orderId: 1, createdAt: -1 });
refundSchema.index(
  { paymentId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

export const Refund = mongoose.models.Refund || mongoose.model('Refund', refundSchema);

export default Refund;
