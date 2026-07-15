import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Schema helpers for analytics PROJECTIONS. Projections are read-optimized,
 * org+restaurant scoped (branch optional). They NEVER mirror business PII — only
 * numeric counters + minimal denormalized labels for display.
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

export const tenantFields = Object.freeze({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
});
