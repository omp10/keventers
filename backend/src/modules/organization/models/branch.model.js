import mongoose from 'mongoose';

import { BRANCH_STATUS } from '../constants/organization.constants.js';
import {
  addressSchema,
  baseSchemaOptions,
  businessHoursSchema,
  softDeleteField,
} from '../utils/schema.util.js';

const { Schema } = mongoose;

const branchSettingsSchema = new Schema(
  {
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    acceptsOnlineOrders: { type: Boolean, default: true },
    tableCount: { type: Number, default: 0 },
  },
  { _id: false },
);

/** GeoJSON Point — [lng, lat]. Optional; branches without coordinates simply
 *  don't appear in geo-ranked discovery results. */
const geoPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined }, // [lng, lat]
  },
  { _id: false },
);

/** Per-branch service mode availability surfaced to customer discovery. */
const branchServiceSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ['dine_in', 'takeaway', 'delivery', 'drive_thru', 'curbside'],
      required: true,
    },
    available: { type: Boolean, default: true },
    etaMinutes: { type: Number, default: null },
  },
  { _id: false },
);

/**
 * Customer-facing DISCOVERY profile — everything the public discovery surface
 * (nearby / search / featured rails, branch page) renders. Managed by the
 * restaurant/admin dashboards; absent fields simply don't render.
 */
const branchDiscoverySchema = new Schema(
  {
    coverImageUrl: { type: String, default: null },
    gallery: {
      type: [new Schema({ url: { type: String }, alt: { type: String, default: '' } }, { _id: false })],
      default: [],
    },
    description: { type: String, default: '' },
    /** Neighbourhood label ("Connaught Place") shown on cards. */
    area: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 0, max: 5, default: null },
    ratingCount: { type: Number, default: 0 },
    prepTimeMinutes: { type: Number, default: null },
    featured: { type: Boolean, default: false, index: true },
    promoted: { type: Boolean, default: false },
    offer: {
      type: new Schema(
        { label: { type: String, trim: true }, description: { type: String, default: '' } },
        { _id: false },
      ),
      default: null,
    },
    /** Backend-owned ranking signal for "popular" rails. */
    popularityScore: { type: Number, default: 0 },
    services: { type: [branchServiceSchema], default: [] },
    amenities: { type: [String], default: [] },
  },
  { _id: false },
);

/**
 * Branch: one operational outlet of a restaurant. Tenant-scoped
 * (organizationId + restaurantId) with independent address, business hours,
 * settings and manager.
 */
const branchSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    /** SEO slug used by the public customer app (/r/:slug). Null = not discoverable. */
    slug: { type: String, trim: true, lowercase: true, default: null },
    address: { type: addressSchema(), default: () => ({}) },
    /** Geo position for nearby/distance ranking (GeoJSON [lng, lat]). */
    location: { type: geoPointSchema, default: null },
    /** Customer-discovery profile (cover, rating, offers, services…). */
    discovery: { type: branchDiscoverySchema, default: () => ({}) },
    businessHours: { type: [businessHoursSchema()], default: [] },
    settings: { type: branchSettingsSchema, default: () => ({}) },
    managerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isPrimary: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(BRANCH_STATUS),
      default: BRANCH_STATUS.ACTIVE,
      index: true,
    },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

branchSchema.index({ restaurantId: 1, status: 1 });
branchSchema.index({ organizationId: 1, restaurantId: 1 });
branchSchema.index({ restaurantId: 1, code: 1 }, { unique: true, sparse: true });
// Partial (not sparse): documents created with an explicit `slug: null` must
// not participate in the unique constraint — only real string slugs do.
branchSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { slug: { $type: 'string' } } },
);
branchSchema.index({ location: '2dsphere' }, { sparse: true });
branchSchema.index({ deletedAt: 1 });

export const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema);

export default Branch;
