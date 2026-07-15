import mongoose from 'mongoose';

import { REWARD_STATUS, REWARD_TYPE } from '../constants/customer.constants.js';
import { baseSchemaOptions, moneyField, softDeleteField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Reward catalog entry — a RESTAURANT-scoped, points-priced reward a customer can
 * redeem. The `value` block is Pricing-Engine-ready (basis points OR minor
 * units), so redemption yields an artifact the Cart/Pricing Engine can apply
 * without this module computing prices. Discount/Free-Product/Cashback/Coupon.
 */
const rewardSchema = new Schema(
  {
    ...tenantFields,

    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: null, maxlength: 500 },
    type: { type: String, enum: Object.values(REWARD_TYPE), required: true },

    /** Points required to redeem. */
    pointsCost: { type: Number, required: true, min: 0 },

    value: {
      // DISCOUNT / COUPON: percentage in BASIS POINTS (e.g. 1000 = 10%) …
      discountBps: { type: Number, default: null, min: 0, max: 10000 },
      // … OR a fixed amount in MINOR UNITS.
      discountAmount: moneyField(0),
      maxDiscountAmount: moneyField(0), // cap for percentage discounts (0 = uncapped)
      minOrderAmount: moneyField(0),
      // FREE_PRODUCT: the product granted on the house.
      freeProductId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
      // CASHBACK: credited amount (minor units) — settled by the future Wallet.
      cashbackAmount: moneyField(0),
      currency: { type: String, default: 'INR' },
    },

    status: { type: String, enum: Object.values(REWARD_STATUS), default: REWARD_STATUS.ACTIVE, index: true },
    // Availability window + tier gating.
    availableFrom: { type: Date, default: null },
    availableUntil: { type: Date, default: null },
    minTier: { type: String, default: null },
    /** Days the issued redemption artifact stays valid (null = no expiry). */
    redemptionValidityDays: { type: Number, default: 30, min: 0 },
    /** Optional per-customer redemption cap (null = unlimited). */
    perCustomerLimit: { type: Number, default: null },
    /** Total remaining stock (null = unlimited). */
    totalStock: { type: Number, default: null },

    imageUrl: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

rewardSchema.index({ restaurantId: 1, status: 1, sortOrder: 1 });
rewardSchema.index({ restaurantId: 1, type: 1 });

export const Reward = mongoose.models.Reward || mongoose.model('Reward', rewardSchema);

export default Reward;
