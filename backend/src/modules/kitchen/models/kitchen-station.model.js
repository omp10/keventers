import mongoose from 'mongoose';

import { STATION_TYPE } from '../constants/kitchen.constants.js';

const { Schema } = mongoose;

/** Product→station routing rules (configurable, future-proof). A product routes
 * to this station if its id is in `productIds`, its category is in
 * `categoryIds`, or the station is the branch default (`isDefault`). */
const routingSchema = new Schema(
  {
    productIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    categoryIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [] },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * KitchenStation: a preparation station within a branch (Grill, Fryer, Beverage,
 * Dessert, Packaging, …). Branch-scoped. Orders route their items to stations
 * via the routing rules. Configurable per branch.
 */
const stationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },

    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(STATION_TYPE), default: STATION_TYPE.GENERAL },
    code: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },

    routing: { type: routingSchema, default: () => ({}) },

    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

stationSchema.index({ organizationId: 1, restaurantId: 1, branchId: 1, name: 1 }, { unique: true });
stationSchema.index({ branchId: 1, isActive: 1, displayOrder: 1 });
stationSchema.index({ deletedAt: 1 });

export const KitchenStation =
  mongoose.models.KitchenStation || mongoose.model('KitchenStation', stationSchema);

export default KitchenStation;
