import mongoose from 'mongoose';

import { SLA_SCOPE } from '../constants/kitchen.constants.js';

const { Schema } = mongoose;

/**
 * KitchenSlaTarget: a configurable preparation-time target (seconds), resolved
 * most-specific-first — a product target overrides a category target overrides
 * the branch default. Branch-scoped. The SLA monitor compares actual prep time
 * against the resolved target and emits a breach event (never notifies users).
 *
 *   product  "Milkshake" → 300s
 *   product  "Burger"    → 480s
 *   default              → 900s
 */
const slaTargetSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },

    scope: { type: String, enum: Object.values(SLA_SCOPE), required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },

    targetSeconds: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

slaTargetSchema.index({ branchId: 1, scope: 1, productId: 1, categoryId: 1 }, { unique: true });
slaTargetSchema.index({ branchId: 1, isActive: 1 });
slaTargetSchema.index({ deletedAt: 1 });

export const KitchenSlaTarget =
  mongoose.models.KitchenSlaTarget || mongoose.model('KitchenSlaTarget', slaTargetSchema);

export default KitchenSlaTarget;
