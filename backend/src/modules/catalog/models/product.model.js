import mongoose from 'mongoose';

import {
  ALLERGEN,
  AVAILABILITY_STATUS,
  DIETARY_TAG,
  PRODUCT_STATUS,
  SPICE_LEVEL,
} from '../constants/catalog.constants.js';
import {
  availabilityWindowSchema,
  baseSchemaOptions,
  imageSchema,
  moneyField,
  softDeleteField,
  tenantFields,
} from '../utils/schema.util.js';

const { Schema } = mongoose;

/** Base + promotional + scheduled pricing. Designed as the extension point for
 * future DYNAMIC pricing (branch overrides live in ProductAvailability / order
 * modules). All amounts are in the restaurant's configured currency. */
const pricingSchema = new Schema(
  {
    basePrice: moneyField(0),
    /** Optional MRP / compare-at price for showing a discount. */
    compareAtPrice: { type: Number, default: null, min: 0 },
    /** Active promotional price (null = none). Superseded by scheduled below. */
    promotionalPrice: { type: Number, default: null, min: 0 },
    /** Time-boxed promotional pricing (resolved by the pricing service). */
    scheduled: {
      type: [
        new Schema(
          {
            price: moneyField(0),
            startDate: { type: Date, default: null },
            endDate: { type: Date, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    taxIncluded: { type: Boolean, default: false },
  },
  { _id: false },
);

/** Nutrition / dietary information block. */
const nutritionSchema = new Schema(
  {
    calories: { type: Number, default: null, min: 0 },
    servingSize: { type: String, trim: true, default: '' },
    protein: { type: Number, default: null, min: 0 },
    carbs: { type: Number, default: null, min: 0 },
    fat: { type: Number, default: null, min: 0 },
  },
  { _id: false },
);

/** Base (restaurant-level) availability. Branch-specific overrides live in the
 * ProductAvailability collection. Time windows drive breakfast/lunch/etc. */
const availabilitySchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(AVAILABILITY_STATUS),
      default: AVAILABILITY_STATUS.AVAILABLE,
    },
    /** When true, only available within the listed windows. */
    scheduled: { type: Boolean, default: false },
    windows: { type: [availabilityWindowSchema()], default: [] },
    /** Temporary disable / restock hint (out-of-stock is inventory's concern,
     * exposed here only as a manual override until the inventory module lands). */
    availableFrom: { type: Date, default: null },
    unavailableReason: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

/**
 * Product: the sellable catalog item. Belongs to a category (main or sub) and
 * one or more menus. Variants live in a separate collection (own price/SKU);
 * modifier groups and add-ons are referenced (reusable). Tenant-scoped
 * (organizationId + restaurantId). Designed for millions of rows across
 * thousands of restaurants — hence the compound + text indexes below.
 */
const productSchema = new Schema(
  {
    ...tenantFields,

    // --- placement ---
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    /** Denormalised main-category id when categoryId is a subcategory (fast
     * "all products under a main category" queries). Equals categoryId for a
     * product placed directly on a main category. */
    rootCategoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    menuIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Menu' }], default: [], index: true },

    // --- identity ---
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    shortDescription: { type: String, trim: true, default: '' },
    sku: { type: String, trim: true, default: null },

    // --- media ---
    images: { type: [imageSchema()], default: [] },
    thumbnailUrl: { type: String, default: null },
    heroImageUrl: { type: String, default: null },

    // --- commerce ---
    pricing: { type: pricingSchema, default: () => ({}) },
    taxCategory: { type: String, trim: true, default: 'standard' },
    preparationTimeMinutes: { type: Number, default: 0, min: 0 },

    // --- classification ---
    dietaryTags: { type: [{ type: String, enum: Object.values(DIETARY_TAG) }], default: [] },
    allergens: { type: [{ type: String, enum: Object.values(ALLERGEN) }], default: [] },
    spiceLevel: { type: String, enum: Object.values(SPICE_LEVEL), default: SPICE_LEVEL.NONE },
    nutrition: { type: nutritionSchema, default: () => ({}) },
    tags: { type: [String], default: [] },

    // --- customisation (references; reusable groups/add-ons) ---
    modifierGroupIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'ModifierGroup' }],
      default: [],
    },
    addonIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Addon' }], default: [] },
    /** True once at least one variant exists (denormalised for listing). */
    hasVariants: { type: Boolean, default: false },

    // --- availability & status ---
    availability: { type: availabilitySchema, default: () => ({}) },
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.DRAFT,
      index: true,
    },

    // --- merchandising flags ---
    isFeatured: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },

    // --- inventory hook (no inventory logic this phase; extension point only) ---
    trackInventory: { type: Boolean, default: false },
    inventoryRef: { type: String, default: null },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

// --- indexes: tenant-scoped uniqueness, hot listing paths, text search ---
// Unique among LIVE products only — see the note on Category's slug index: the
// availability check can't see soft-deleted rows, so an unfiltered unique index
// makes a deleted product's name unusable forever.
productSchema.index(
  { organizationId: 1, restaurantId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
productSchema.index(
  { restaurantId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } },
);
productSchema.index({ restaurantId: 1, categoryId: 1, status: 1, displayOrder: 1 });
productSchema.index({ restaurantId: 1, rootCategoryId: 1, status: 1 });
productSchema.index({ restaurantId: 1, status: 1, isFeatured: 1 });
productSchema.index({ restaurantId: 1, status: 1, isPopular: 1 });
productSchema.index({ restaurantId: 1, menuIds: 1, status: 1 });
productSchema.index({ restaurantId: 1, dietaryTags: 1 });
productSchema.index({ deletedAt: 1 });
// Free-text search across name/description/tags (weighted to the name).
productSchema.index(
  { name: 'text', description: 'text', tags: 'text' },
  { weights: { name: 10, tags: 4, description: 1 }, name: 'product_text' },
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
