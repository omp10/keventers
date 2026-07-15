import mongoose from 'mongoose';

import {
  ENTITY_STATUS,
  MODIFIER_GROUP_TYPE,
} from '../constants/catalog.constants.js';
import {
  baseSchemaOptions,
  softDeleteField,
  tenantFields,
} from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * ModifierGroup: a set of related choices attached to products (Choose Size,
 * Choose Bread, Choose Sugar, Choose Cheese). REUSABLE across many products —
 * products reference groups by id. Selection semantics (required, min/max) are
 * enforced by the cart/order modules at add-to-cart time; the bounds are stored
 * here. Modifiers belong to a group (see modifier.model). Tenant-scoped.
 */
const modifierGroupSchema = new Schema(
  {
    ...tenantFields,

    name: { type: String, required: true, trim: true }, // e.g. "Choose Size"
    description: { type: String, trim: true, default: '' },

    type: {
      type: String,
      enum: Object.values(MODIFIER_GROUP_TYPE),
      default: MODIFIER_GROUP_TYPE.SINGLE,
    },
    isRequired: { type: Boolean, default: false },
    /** Selection bounds. minSelection=0 → optional; maxSelection null → unbounded
     * (validated against the number of modifiers at cart time). */
    minSelection: { type: Number, default: 0, min: 0 },
    maxSelection: { type: Number, default: 1, min: 0 },

    displayOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
      index: true,
    },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

modifierGroupSchema.index({ restaurantId: 1, status: 1, displayOrder: 1 });
modifierGroupSchema.index({ organizationId: 1, restaurantId: 1, name: 1 });
modifierGroupSchema.index({ deletedAt: 1 });

export const ModifierGroup =
  mongoose.models.ModifierGroup || mongoose.model('ModifierGroup', modifierGroupSchema);

export default ModifierGroup;
