import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Shared Mongoose schema helpers for the Customer Platform. Customers are
 * RESTAURANT-scoped (org + restaurant) — NOT branch-scoped (orders remain
 * branch-scoped; a customer transacts across a restaurant's branches). Money is
 * ALWAYS an integer minor-unit amount; loyalty points are integers.
 */
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

export const softDeleteField = Object.freeze({ deletedAt: { type: Date, default: null } });

/** Restaurant-scoped tenant ownership (branch optional — the origin branch). */
export const tenantFields = Object.freeze({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
});

/** Integer minor-unit money (never a float). */
export const moneyField = (defaultValue = 0) => ({ type: Number, default: defaultValue, min: 0 });

/** Integer loyalty points (may be negative on ledger entries). */
export const pointsField = (defaultValue = 0) => ({ type: Number, default: defaultValue });
