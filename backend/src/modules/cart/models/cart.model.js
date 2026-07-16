import mongoose from 'mongoose';

import { CART_STATUS } from '../constants/cart.constants.js';

const { Schema } = mongoose;

/** A selected modifier snapshot (price frozen at add time, integer minor units). */
const cartModifierSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'ModifierGroup' },
    groupName: { type: String, default: '' },
    modifierId: { type: Schema.Types.ObjectId, ref: 'Modifier' },
    name: { type: String, default: '' },
    unitPrice: { type: Number, default: 0, min: 0 }, // minor units
  },
  { _id: false },
);

/** A selected add-on snapshot. */
const cartAddonSchema = new Schema(
  {
    addonId: { type: Schema.Types.ObjectId, ref: 'Addon' },
    name: { type: String, default: '' },
    unitPrice: { type: Number, default: 0, min: 0 }, // minor units
  },
  { _id: false },
);

/** Per-item PRICE SNAPSHOT (integer minor units). Captured when the item is
 * added so later catalog changes never mutate a stored cart line. All amounts
 * are minor units in the cart currency. */
const itemPricingSchema = new Schema(
  {
    currency: { type: String, default: 'INR' },
    base: { type: Number, default: 0 }, // product base (minor)
    variant: { type: Number, default: 0 }, // variant delta (may be negative)
    modifiersTotal: { type: Number, default: 0 },
    addonsTotal: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 }, // base+variant+modifiers+addons
    capturedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

/**
 * CartItem: a line in the cart. Snapshots ONLY what is needed for historical
 * consistency (names + frozen prices) — it references catalog ids, never
 * duplicating full product documents.
 */
const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productSnapshot: {
      name: { type: String, default: '' },
      slug: { type: String, default: '' },
      sku: { type: String, default: null },
      thumbnailUrl: { type: String, default: null },
      categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant', default: null },
    variantSnapshot: {
      name: { type: String, default: '' },
    },
    modifiers: { type: [cartModifierSchema], default: [] },
    addons: { type: [cartAddonSchema], default: [] },

    quantity: { type: Number, required: true, min: 1 },
    specialInstructions: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },

    pricing: { type: itemPricingSchema, default: () => ({}) },
    lineSubtotal: { type: Number, default: 0 }, // unitPrice * quantity (minor)

    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: true, timestamps: true },
);

/**
 * Cart: the editable representation of an order, owned by a GUEST SESSION.
 * Tenant-scoped (organization + restaurant + branch + session). Stores the last
 * computed pricing breakdown (from the Pricing Engine) for fast reads.
 * Optimistically versioned to prevent concurrent-device overwrites.
 */
const cartSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },

    /** The owning guest session (NOT a customer). */
    sessionId: { type: String, required: true },
    guestId: { type: String, default: null },
    /** Set if the guest links a registered account (history preserved). */
    customerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    tableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null },
    currency: { type: String, default: 'INR' },

    status: {
      type: String,
      enum: Object.values(CART_STATUS),
      default: CART_STATUS.ACTIVE,
      index: true,
    },

    items: { type: [cartItemSchema], default: [] },

    coupon: {
      couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
      code: { type: String, default: null },
      snapshot: { type: Schema.Types.Mixed, default: null },
    },

    /** Last Pricing Engine breakdown (serialized DTO — integer minor units). */
    pricing: { type: Schema.Types.Mixed, default: null },

    /** Optimistic-concurrency version (incremented on every mutation). */
    version: { type: Number, default: 0 },

    lastActivityAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true, index: true },
    lockedAt: { type: Date, default: null },
    convertedOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    endedReason: { type: String, default: null },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// One ACTIVE cart per guest session (partial unique).
cartSchema.index({ sessionId: 1 }, { unique: true, partialFilterExpression: { status: CART_STATUS.ACTIVE } });
cartSchema.index({ branchId: 1, status: 1, createdAt: -1 });
cartSchema.index({ restaurantId: 1, status: 1 });
cartSchema.index({ 'items.productId': 1 });
// Expiration sweep index.
cartSchema.index({ status: 1, expiresAt: 1 });

export const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

export default Cart;
