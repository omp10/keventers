import mongoose from 'mongoose';

import {
  ACTOR_TYPE,
  NOTE_TYPE,
  NOTE_VISIBILITY,
  ORDER_STATUS,
  ORDER_TYPE,
  PAYMENT_STATUS,
  REFUND_STATUS,
} from '../constants/order.constants.js';

const { Schema } = mongoose;

/** Immutable per-item price snapshot (integer minor units). */
const orderItemPricingSchema = new Schema(
  {
    currency: { type: String, default: 'INR' },
    base: { type: Number, default: 0 },
    variant: { type: Number, default: 0 },
    modifiersTotal: { type: Number, default: 0 },
    addonsTotal: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
  },
  { _id: false },
);

/** A frozen order line — snapshots names + prices so catalog changes never
 * alter a placed order. References catalog ids for reporting, never duplicating
 * full product documents. */
const orderItemSchema = new Schema(
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
    variantSnapshot: { name: { type: String, default: '' } },
    modifiers: {
      type: [
        new Schema(
          {
            groupId: { type: Schema.Types.ObjectId, ref: 'ModifierGroup' },
            groupName: { type: String, default: '' },
            modifierId: { type: Schema.Types.ObjectId, ref: 'Modifier' },
            name: { type: String, default: '' },
            unitPrice: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    addons: {
      type: [
        new Schema(
          {
            addonId: { type: Schema.Types.ObjectId, ref: 'Addon' },
            name: { type: String, default: '' },
            unitPrice: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    quantity: { type: Number, required: true, min: 1 },
    specialInstructions: { type: String, default: '' },
    notes: { type: String, default: '' },
    pricing: { type: orderItemPricingSchema, default: () => ({}) },
    lineSubtotal: { type: Number, default: 0 },
  },
  { _id: true },
);

/** Immutable timeline entry (append-only — never mutated). */
const timelineSchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorType: { type: String, enum: Object.values(ACTOR_TYPE), default: ACTOR_TYPE.SYSTEM },
    previousStatus: { type: String, default: null },
    newStatus: { type: String, required: true },
    reason: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { _id: false },
);

/** Order note with permission-based visibility. */
const noteSchema = new Schema(
  {
    type: { type: String, enum: Object.values(NOTE_TYPE), required: true },
    visibility: { type: String, enum: Object.values(NOTE_VISIBILITY), default: NOTE_VISIBILITY.INTERNAL },
    body: { type: String, required: true, trim: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    authorType: { type: String, enum: Object.values(ACTOR_TYPE), default: ACTOR_TYPE.SYSTEM },
    at: { type: Date, default: () => new Date() },
  },
  { _id: true },
);

/**
 * Order: the permanent, immutable record of a placed cart. Multi-tenant
 * (organization + restaurant + branch + guest session, optionally customer).
 * Stores immutable snapshots of everything price/catalog-related so future
 * catalog changes never affect existing orders. Pricing is ALWAYS the Pricing
 * Engine breakdown captured from the locked cart — the order never computes it.
 */
const orderSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },

    sessionId: { type: String, required: true, index: true },
    guestId: { type: String, default: null },
    customerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null },

    /** Source cart — UNIQUE, guaranteeing one order per cart (idempotency). */
    cartId: { type: Schema.Types.ObjectId, ref: 'Cart', required: true },
    /** Human-facing, unique, never a Mongo id. */
    orderNumber: { type: String, required: true },

    orderType: { type: String, enum: Object.values(ORDER_TYPE), default: ORDER_TYPE.DINE_IN },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.CREATED, index: true },

    items: { type: [orderItemSchema], default: [] },
    currency: { type: String, default: 'INR' },

    /** Immutable Pricing-Engine breakdown snapshot (integer minor units). */
    pricing: { type: Schema.Types.Mixed, required: true },
    /** Immutable coupon snapshot (or null). */
    coupon: { type: Schema.Types.Mixed, default: null },

    /** Immutable business snapshots. */
    snapshots: {
      restaurant: { type: Schema.Types.Mixed, default: null },
      branch: { type: Schema.Types.Mixed, default: null },
      session: { type: Schema.Types.Mixed, default: null },
      customer: { type: Schema.Types.Mixed, default: null },
    },

    timeline: { type: [timelineSchema], default: [] },
    notes: { type: [noteSchema], default: [] },

    // --- payment (EXTENSION POINT — no processing this phase) ---
    payment: {
      status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.AWAITING_PAYMENT },
      reference: { type: String, default: null },
      updatedAt: { type: Date, default: null },
    },

    // --- refund (EXTENSION POINT — no money movement this phase) ---
    refund: {
      status: { type: String, enum: Object.values(REFUND_STATUS), default: REFUND_STATUS.NONE },
      reason: { type: String, default: '' },
      requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      requestedAt: { type: Date, default: null },
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      resolvedAt: { type: Date, default: null },
    },

    // --- split bill (EXTENSION POINT — reserved) ---
    splitBill: {
      enabled: { type: Boolean, default: false },
    },

    cancellation: {
      source: { type: String, default: null },
      reason: { type: String, default: '' },
      actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      actorType: { type: String, default: null },
      at: { type: Date, default: null },
    },

    // Denormalised lifecycle timestamps (fast reporting).
    placedAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    servedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    /** Optimistic-concurrency version. */
    version: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// Uniqueness (idempotency + customer-facing number).
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ cartId: 1 }, { unique: true });
// Common report/list filters.
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ branchId: 1, status: 1, createdAt: -1 });
orderSchema.index({ customerUserId: 1, createdAt: -1 });
orderSchema.index({ sessionId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ organizationId: 1, createdAt: -1 });
orderSchema.index({ deletedAt: 1 });
// PLATFORM-WIDE admin views: every other index above is prefixed by a tenant id,
// so "all orders across the platform, newest first" (and the same filtered by
// status, which is what live tracking polls) had no index to stand on.
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
