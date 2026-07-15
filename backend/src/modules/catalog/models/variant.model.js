import mongoose from 'mongoose';

import { ENTITY_STATUS } from '../constants/catalog.constants.js';
import {
  baseSchemaOptions,
  moneyField,
  softDeleteField,
  tenantFields,
} from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Variant: a purchasable variation of a product (Small/Medium/Large,
 * Regular/Family). A SEPARATE collection (not embedded) so each variant carries
 * its OWN price, SKU, availability and preparation time, and so variants can be
 * managed/indexed independently at scale. Tenant-scoped + linked to a product.
 */
const variantSchema = new Schema(
  {
    ...tenantFields,

    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },

    name: { type: String, required: true, trim: true }, // e.g. "Large"
    sku: { type: String, trim: true, default: null },

    price: moneyField(0),
    compareAtPrice: { type: Number, default: null, min: 0 },

    /** Own availability + prep time (override the product's defaults). */
    isAvailable: { type: Boolean, default: true },
    preparationTimeMinutes: { type: Number, default: null, min: 0 },

    /** Marks the default-selected variant in ordering UIs. */
    isDefault: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },

    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
    },

    // Inventory hook (extension point only).
    trackInventory: { type: Boolean, default: false },
    inventoryRef: { type: String, default: null },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

variantSchema.index({ restaurantId: 1, productId: 1, displayOrder: 1 });
variantSchema.index(
  { restaurantId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } },
);
variantSchema.index({ deletedAt: 1 });

export const Variant = mongoose.models.Variant || mongoose.model('Variant', variantSchema);

export default Variant;
