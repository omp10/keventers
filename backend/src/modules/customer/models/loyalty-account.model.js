import mongoose from 'mongoose';

import { LOYALTY_TIER } from '../constants/customer.constants.js';
import { baseSchemaOptions, pointsField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Loyalty account — the fast-read PROJECTION of the immutable ledger. `balance`
 * and `lifetimePoints` are CACHED aggregates kept in step with the ledger inside
 * a per-customer lock; the ledger is always authoritative and can rebuild them.
 * The TIER is derived from `lifetimePoints` (redeeming never demotes). One per
 * customer.
 */
const loyaltyAccountSchema = new Schema(
  {
    ...tenantFields,
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    /** Spendable balance = signed sum of ledger entries (never negative). */
    balance: pointsField(0),
    /** Cumulative EARNED points (earn + bonus). Drives the tier; never decreases. */
    lifetimePoints: pointsField(0),
    /** Cumulative redeemed points (for reporting). */
    redeemedPoints: pointsField(0),
    /** Cumulative expired points (for reporting). */
    expiredPoints: pointsField(0),

    tier: { type: String, enum: Object.values(LOYALTY_TIER), default: LOYALTY_TIER.BRONZE, index: true },
    tierUpdatedAt: { type: Date, default: null },

    lastEarnedAt: { type: Date, default: null },
    lastRedeemedAt: { type: Date, default: null },

    /** Optimistic concurrency for balance mutations. */
    version: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

loyaltyAccountSchema.index({ restaurantId: 1, tier: 1 });
loyaltyAccountSchema.index({ restaurantId: 1, balance: -1 });

export const LoyaltyAccount =
  mongoose.models.LoyaltyAccount || mongoose.model('LoyaltyAccount', loyaltyAccountSchema);

export default LoyaltyAccount;
