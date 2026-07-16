import mongoose from 'mongoose';

import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

export const CATEGORY_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

/**
 * StorefrontCategory: an ADMIN-MANAGED, customer-facing browse category (the
 * circular tiles on the customer home). Platform-scoped content — admins curate
 * the name, artwork and order; tapping one searches `searchTerm` across
 * discovery.
 *
 * NAMING IS LOAD-BEARING: the catalog module registers its own `Category` model
 * (a restaurant's menu sections). Mongoose keys models by name globally, so
 * reusing 'Category' here would make whichever module loaded second silently
 * inherit the other's schema AND collection. Hence the distinct model name and
 * an explicit collection.
 */
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
    /** Tile artwork (uploaded via the media endpoint). Falls back to `icon`. */
    imageUrl: { type: String, default: null },
    /** Semantic icon name from the client registry, used when no image is set. */
    icon: { type: String, trim: true, default: 'utensils' },
    /** What tapping the tile searches for (defaults to the name). */
    searchTerm: { type: String, trim: true, default: '' },
    /** Show in the home tile rail (vs. available but hidden). */
    featured: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(CATEGORY_STATUS),
      default: CATEGORY_STATUS.ACTIVE,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ...softDeleteField,
  },
  { ...baseSchemaOptions, collection: 'storefrontcategories' },
);

categorySchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: 'string' } } });
categorySchema.index({ status: 1, sortOrder: 1 });
categorySchema.index({ deletedAt: 1 });

export const StorefrontCategory =
  mongoose.models.StorefrontCategory || mongoose.model('StorefrontCategory', categorySchema);

/** @deprecated Prefer `StorefrontCategory` — kept so existing imports keep working. */
export const Category = StorefrontCategory;

export default StorefrontCategory;
