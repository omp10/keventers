import mongoose from 'mongoose';

import { CATEGORY_STATUS } from '../constants/catalog.constants.js';
import {
  baseSchemaOptions,
  softDeleteField,
  tenantFields,
} from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Category: a SINGLE self-referencing model (NOT separate Category/SubCategory
 * collections). `parentId === null` → MAIN category; `parentId !== null` →
 * SUBCATEGORY. The service layer enforces a MAXIMUM DEPTH of 2 (a subcategory
 * can never be a parent). `depth` is denormalised (0 = main, 1 = sub) for cheap
 * queries and guard checks. Tenant-scoped (organizationId + restaurantId).
 */
const categorySchema = new Schema(
  {
    ...tenantFields,

    /** Which menu this category belongs to (a category lives under one menu). */
    menuId: { type: Schema.Types.ObjectId, ref: 'Menu', default: null, index: true },

    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    /** 0 = main category, 1 = subcategory. Enforced <= 1 by the service. */
    depth: { type: Number, default: 0, min: 0, max: 1 },

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, default: '' },

    imageUrl: { type: String, default: null },
    imageKey: { type: String, default: null },
    iconUrl: { type: String, default: null },

    status: {
      type: String,
      enum: Object.values(CATEGORY_STATUS),
      default: CATEGORY_STATUS.ACTIVE,
      index: true,
    },
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

// Tenant-scoped uniqueness + query paths (list mains, list a parent's children).
//
// Unique among LIVE categories only. The service checks a slug's availability
// with `existsBySlug`, which on a soft-delete repo cannot see deleted rows — so
// without this filter the check says "free" while the index says "taken", and
// deleting a category burned its name forever: re-creating it died on a raw
// E11000 surfaced as a 500.
categorySchema.index(
  { organizationId: 1, restaurantId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
categorySchema.index({ restaurantId: 1, parentId: 1, displayOrder: 1 });
categorySchema.index({ restaurantId: 1, menuId: 1, status: 1 });
categorySchema.index({ restaurantId: 1, status: 1 });
categorySchema.index({ deletedAt: 1 });

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
