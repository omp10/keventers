import mongoose from 'mongoose';

import { DAYS_OF_WEEK, IMAGE_ROLE } from '../constants/catalog.constants.js';

const { Schema } = mongoose;

/** Shared schema options: timestamps, virtual `id`, `_id` stripped from JSON. */
export const baseSchemaOptions = Object.freeze({
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      delete ret._id;
      return ret;
    },
  },
  toObject: { virtuals: true },
});

export const softDeleteField = Object.freeze({
  deletedAt: { type: Date, default: null },
});

/** Tenant-ownership fields shared by every catalog entity. Branch-scoped
 * entities add their own branchId; these three are mandatory everywhere. */
export const tenantFields = Object.freeze({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  },
});

/** Uploaded image reference (persisted via the Storage Platform — the `key`
 * lets the service delete/replace the underlying object later). */
export function imageSchema() {
  return new Schema(
    {
      role: { type: String, enum: Object.values(IMAGE_ROLE), default: IMAGE_ROLE.GALLERY },
      key: { type: String, default: null },
      url: { type: String, required: true },
      alt: { type: String, trim: true, default: '' },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      displayOrder: { type: Number, default: 0 },
    },
    { _id: false },
  );
}

/** A single time-based availability window (e.g. breakfast 08:00–11:00). */
export function availabilityWindowSchema() {
  return new Schema(
    {
      label: { type: String, trim: true, default: '' },
      days: { type: [{ type: String, enum: DAYS_OF_WEEK }], default: [] },
      startTime: { type: String, default: '00:00' }, // "HH:mm"
      endTime: { type: String, default: '23:59' },
    },
    { _id: false },
  );
}

/** Money as a plain number in the restaurant's currency (minor-unit handling is
 * deferred to the pricing/payment modules). Amounts are always >= 0. */
export const moneyField = (defaultValue = 0) => ({
  type: Number,
  default: defaultValue,
  min: 0,
});
