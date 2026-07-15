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
 * Add-on: an optional extra product-like item (Extra Fries, Extra Drink, Ice
 * Cream, Gift Wrapping). REUSABLE across multiple products — products reference
 * add-ons by id. Unlike modifiers (which vary an item), an add-on is a
 * standalone priced extra. Tenant-scoped.
 */
const addonSchema = new Schema(
  {
    ...tenantFields,

    name: { type: String, required: true, trim: true }, // e.g. "Extra Fries"
    description: { type: String, trim: true, default: '' },

    price: moneyField(0),
    calories: { type: Number, default: null, min: 0 },

    imageUrl: { type: String, default: null },
    imageKey: { type: String, default: null },

    isAvailable: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
      index: true,
    },

    // Inventory hook (extension point only).
    trackInventory: { type: Boolean, default: false },
    inventoryRef: { type: String, default: null },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

addonSchema.index({ restaurantId: 1, status: 1, displayOrder: 1 });
addonSchema.index({ organizationId: 1, restaurantId: 1, name: 1 });
addonSchema.index({ deletedAt: 1 });

export const Addon = mongoose.models.Addon || mongoose.model('Addon', addonSchema);

export default Addon;
