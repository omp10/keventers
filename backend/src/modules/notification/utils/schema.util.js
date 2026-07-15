import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Shared schema helpers for the Notification Engine. A notification belongs to an
 * organization + restaurant (required) and OPTIONALLY a branch / customer / user.
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

/** Required org+restaurant, optional branch — the tenant envelope. */
export const tenantFields = Object.freeze({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
});
