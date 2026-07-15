import mongoose from 'mongoose';

import {
  COUPON_STATUS,
  COUPON_TYPE,
} from '../constants/pricing.constants.js';

const { Schema } = mongoose;

/**
 * Coupon: a restaurant-scoped promotional code evaluated by the Pricing Engine.
 * Monetary fields (`value` for fixed, `minSubtotal`, `maxDiscount`) are integer
 * MINOR units; `value` for a percentage coupon is BASIS POINTS. Tenant-scoped
 * (organization + restaurant).
 */
const couponSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },

    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true, default: '' },

    type: { type: String, enum: Object.values(COUPON_TYPE), required: true },
    /** bps for percentage, minor units for fixed, unused for item coupons. */
    value: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },

    minSubtotal: { type: Number, default: null, min: 0 }, // minor units
    maxDiscount: { type: Number, default: null, min: 0 }, // minor units (cap)

    // Item / BXGY targeting.
    targetProductId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    buyQuantity: { type: Number, default: null, min: 1 },
    getQuantity: { type: Number, default: null, min: 1 },

    status: {
      type: String,
      enum: Object.values(COUPON_STATUS),
      default: COUPON_STATUS.ACTIVE,
      index: true,
    },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },

    usageLimit: { type: Number, default: null, min: 0 },
    usageCount: { type: Number, default: 0, min: 0 },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// Tenant-scoped unique code + hot lookups.
couponSchema.index({ organizationId: 1, restaurantId: 1, code: 1 }, { unique: true });
couponSchema.index({ restaurantId: 1, status: 1 });
couponSchema.index({ validUntil: 1 });
couponSchema.index({ deletedAt: 1 });

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

export default Coupon;
