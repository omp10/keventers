import mongoose from 'mongoose';

import { AVAILABILITY_STATUS } from '../constants/catalog.constants.js';
import {
  availabilityWindowSchema,
  baseSchemaOptions,
  softDeleteField,
  tenantFields,
} from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * ProductAvailability: a BRANCH-SPECIFIC override of a product's availability.
 * The product carries restaurant-level (default) availability; a row here
 * narrows or overrides it for one branch — supporting "available at branch A,
 * out of stock at branch B", holiday overrides and temporary disables without
 * touching the shared product document. Absence of a row = inherit the
 * product default. Tenant-scoped (+ branchId).
 */
const productAvailabilitySchema = new Schema(
  {
    ...tenantFields,

    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    /** Optional: narrow the override to a single variant. */
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant', default: null },

    status: {
      type: String,
      enum: Object.values(AVAILABILITY_STATUS),
      default: AVAILABILITY_STATUS.AVAILABLE,
    },
    isAvailable: { type: Boolean, default: true },

    /** Time-based override windows (empty = all-day for the given status). */
    windows: { type: [availabilityWindowSchema()], default: [] },

    /** Holiday / temporary override window and reason. */
    overrideFrom: { type: Date, default: null },
    overrideUntil: { type: Date, default: null },
    reason: { type: String, trim: true, default: '' },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

// One override row per (branch, product, variant) tuple.
productAvailabilitySchema.index(
  { branchId: 1, productId: 1, variantId: 1 },
  { unique: true },
);
productAvailabilitySchema.index({ restaurantId: 1, branchId: 1, status: 1 });
productAvailabilitySchema.index({ productId: 1 });
productAvailabilitySchema.index({ deletedAt: 1 });

export const ProductAvailability =
  mongoose.models.ProductAvailability ||
  mongoose.model('ProductAvailability', productAvailabilitySchema);

export default ProductAvailability;
