import mongoose from 'mongoose';

import { REDEMPTION_STATUS, REWARD_TYPE } from '../constants/customer.constants.js';
import { baseSchemaOptions, moneyField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Reward redemption — records that a customer spent points to claim a reward.
 * `outcome` is the immutable, Pricing-Engine-ready artifact (a snapshot of the
 * reward's value at redemption time + a single-use code) that the Cart/Pricing
 * Engine can later apply to an order. Linked to the loyalty ledger REDEEM entry.
 */
const redemptionSchema = new Schema(
  {
    ...tenantFields,
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rewardId: { type: Schema.Types.ObjectId, ref: 'Reward', required: true, index: true },

    code: { type: String, required: true, unique: true }, // single-use RWD-… voucher
    rewardType: { type: String, enum: Object.values(REWARD_TYPE), required: true },
    pointsSpent: { type: Number, required: true, min: 0 },

    /** Immutable snapshot of what this redemption grants (pricing-ready). */
    outcome: {
      discountBps: { type: Number, default: null },
      discountAmount: moneyField(0),
      maxDiscountAmount: moneyField(0),
      minOrderAmount: moneyField(0),
      freeProductId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
      cashbackAmount: moneyField(0),
      currency: { type: String, default: 'INR' },
    },

    status: { type: String, enum: Object.values(REDEMPTION_STATUS), default: REDEMPTION_STATUS.ISSUED, index: true },
    /** The loyalty ledger entry that debited the points (for reversal). */
    ledgerId: { type: Schema.Types.ObjectId, ref: 'LoyaltyLedger', default: null },
    /** Set when APPLIED against an order. */
    appliedOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    expiresAt: { type: Date, default: null, index: true },
    appliedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    version: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

redemptionSchema.index({ code: 1 }, { unique: true });
redemptionSchema.index({ customerId: 1, status: 1, createdAt: -1 });
redemptionSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });

export const RewardRedemption =
  mongoose.models.RewardRedemption || mongoose.model('RewardRedemption', redemptionSchema);

export default RewardRedemption;
