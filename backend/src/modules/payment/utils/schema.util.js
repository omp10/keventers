import mongoose from 'mongoose';

const { Schema } = mongoose;

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

/** Tenant-ownership fields shared by every financial entity. */
export const tenantFields = Object.freeze({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
});

/** Money is ALWAYS an integer minor-unit amount (never a float). */
export const moneyField = (defaultValue = 0) => ({ type: Number, default: defaultValue, min: 0 });
