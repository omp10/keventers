import mongoose from 'mongoose';

import { baseSchemaOptions, moneyField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

export const SUBSCRIPTION_STATUS = Object.freeze({
  /** Purchased in-app, to be settled at the counter (no online sub-billing yet). */
  PENDING_PAYMENT: 'pending_payment',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

/**
 * Subscription — one customer's purchase of a SubscriptionPlan for one period.
 * Denormalizes the plan's name/price/quota at purchase time so later plan edits
 * never rewrite what someone already bought.
 *
 * ponytail: usage (`usedCount`) is tracked but not yet auto-decremented by
 * orders — staff activate/complete via the dashboard; wire order-time
 * redemption when the business defines which products count against quota.
 */
const subscriptionSchema = new Schema(
  {
    ...tenantFields,

    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    /** Snapshot of what was bought. */
    planName: { type: String, required: true },
    pricePaid: moneyField(0),
    currency: { type: String, default: 'INR' },
    itemQuota: { type: Number, default: 0 },

    status: { type: String, enum: Object.values(SUBSCRIPTION_STATUS), default: SUBSCRIPTION_STATUS.PENDING_PAYMENT, index: true },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    usedCount: { type: Number, default: 0, min: 0 },
  },
  baseSchemaOptions,
);

subscriptionSchema.index({ organizationId: 1, restaurantId: 1, status: 1, createdAt: -1 });

export const Subscription =
  mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
