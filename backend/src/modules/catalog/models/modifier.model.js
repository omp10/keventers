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
 * Modifier: an individual choice within a ModifierGroup (Extra Cheese, No
 * Onion, Extra Ice, No Sugar). Carries its own price delta, calories, display
 * order and availability. Belongs to exactly one group. Tenant-scoped.
 */
const modifierSchema = new Schema(
  {
    ...tenantFields,

    groupId: { type: Schema.Types.ObjectId, ref: 'ModifierGroup', required: true, index: true },

    name: { type: String, required: true, trim: true }, // e.g. "Extra Cheese"
    /** Price delta added to the line item (>= 0; free modifiers use 0). */
    price: moneyField(0),
    calories: { type: Number, default: null, min: 0 },

    isDefault: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },

    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
    },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

modifierSchema.index({ restaurantId: 1, groupId: 1, displayOrder: 1 });
modifierSchema.index({ deletedAt: 1 });

export const Modifier = mongoose.models.Modifier || mongoose.model('Modifier', modifierSchema);

export default Modifier;
