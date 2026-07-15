import mongoose from 'mongoose';

import {
  ACCOUNT_STATUS,
  CONSENT_TYPE,
  CUSTOMER_ORIGIN,
  DIETARY_PREFERENCE,
  TIMELINE_EVENT,
} from '../constants/customer.constants.js';
import {
  baseSchemaOptions,
  moneyField,
  softDeleteField,
  tenantFields,
} from '../utils/schema.util.js';

const { Schema } = mongoose;

/** Marketing / consent flags with an audit timestamp per grant/withdraw. */
const consentSchema = new Schema(
  {
    type: { type: String, enum: Object.values(CONSENT_TYPE), required: true },
    granted: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
    source: { type: String, default: null }, // e.g. 'signup', 'profile', 'import'
  },
  { _id: false },
);

/** Embedded, editable customer preferences. */
const preferencesSchema = new Schema(
  {
    favoriteProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    favoriteCategoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    dietary: [{ type: String, enum: Object.values(DIETARY_PREFERENCE) }],
    allergies: [{ type: String, trim: true, maxlength: 80 }],
    language: { type: String, default: 'en', maxlength: 8 },
    notifications: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      loyalty: { type: Boolean, default: true },
    },
  },
  { _id: false },
);

/**
 * Event-driven analytics PROJECTION. Maintained by consuming Order/Payment
 * events — NEVER recomputed from raw orders on a profile read. `favoriteProducts`
 * is a small bounded top-N counter list (orderedCount desc), trimmed on write.
 */
const statsSchema = new Schema(
  {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    lifetimeSpend: moneyField(0), // minor units, net of refunds
    totalRefunded: moneyField(0),
    avgOrderValue: moneyField(0),
    visitCount: { type: Number, default: 0 },
    lastVisitAt: { type: Date, default: null },
    firstOrderAt: { type: Date, default: null },
    favoriteProducts: [
      {
        _id: false,
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String, default: null },
        orderedCount: { type: Number, default: 0 },
      },
    ],
  },
  { _id: false },
);

/** Immutable timeline entry (append-only, capped to the newest N in the service). */
const timelineSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    event: { type: String, enum: Object.values(TIMELINE_EVENT), required: true },
    detail: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

/**
 * Customer aggregate root — RESTAURANT-scoped (org + restaurant), linked to an
 * identity `userId`. One customer per (organization, restaurant, userId). Origin
 * may be an anonymous guest session that later linked an account; the migration
 * is idempotent and preserves all history. Addresses + loyalty + ledger live in
 * their own collections for scale; preferences/stats/timeline are embedded.
 */
const customerSchema = new Schema(
  {
    ...tenantFields,

    /** The identity user this customer profile belongs to. */
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    origin: { type: String, enum: Object.values(CUSTOMER_ORIGIN), default: CUSTOMER_ORIGIN.GUEST_SESSION },
    /** The guest session that originated / most recently linked this customer. */
    originSessionId: { type: String, default: null },

    // Profile snapshot (denormalized from identity for fast reads / segmentation).
    displayName: { type: String, default: null, trim: true, maxlength: 120 },
    email: { type: String, default: null, lowercase: true, trim: true, index: true },
    phone: { type: String, default: null, trim: true, index: true },

    accountStatus: { type: String, enum: Object.values(ACCOUNT_STATUS), default: ACCOUNT_STATUS.ACTIVE, index: true },

    preferences: { type: preferencesSchema, default: () => ({}) },
    marketing: {
      optedIn: { type: Boolean, default: false },
      consents: { type: [consentSchema], default: [] },
    },
    stats: { type: statsSchema, default: () => ({}) },
    timeline: { type: [timelineSchema], default: [] },

    /** Free-form, extensible metadata (CRM tags, segments, external refs). */
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
    tags: [{ type: String, trim: true, maxlength: 40 }],

    // GDPR / lifecycle
    gdprErasedAt: { type: Date, default: null },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

// One customer per identity user per restaurant (idempotent guest→customer merge).
customerSchema.index({ organizationId: 1, restaurantId: 1, userId: 1 }, { unique: true });
// Hot lookups + segmentation / reporting.
customerSchema.index({ restaurantId: 1, accountStatus: 1, createdAt: -1 });
customerSchema.index({ restaurantId: 1, 'stats.lifetimeSpend': -1 });
customerSchema.index({ restaurantId: 1, 'stats.lastVisitAt': -1 });
customerSchema.index({ restaurantId: 1, tags: 1 });

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export default Customer;
