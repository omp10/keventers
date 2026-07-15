import mongoose from 'mongoose';

import {
  ONBOARDING_STEPS,
  RESTAURANT_STATUS,
  RESTAURANT_TYPE,
} from '../constants/organization.constants.js';
import { addressSchema, baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/** Rich restaurant settings (branding, theme, tax, order & QR preferences). */
const restaurantSettingsSchema = new Schema(
  {
    branding: {
      logoUrl: { type: String, default: null },
      logoKey: { type: String, default: null },
      coverImageUrl: { type: String, default: null },
    },
    theme: {
      primaryColor: { type: String, default: '#E4002B' },
      secondaryColor: { type: String, default: '#1A1A1A' },
    },
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    tax: {
      enabled: { type: Boolean, default: true },
      inclusive: { type: Boolean, default: false },
      rates: {
        type: [
          new Schema(
            { name: { type: String }, percentage: { type: Number, default: 0 } },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
    contact: {
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      website: { type: String, trim: true, default: '' },
    },
    social: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      twitter: { type: String, default: '' },
    },
    delivery: {
      enabled: { type: Boolean, default: false },
      radiusKm: { type: Number, default: 5 },
    },
    orderPreferences: {
      dineIn: { type: Boolean, default: true },
      takeaway: { type: Boolean, default: true },
      delivery: { type: Boolean, default: false },
      minOrderAmount: { type: Number, default: 0 },
    },
    qr: {
      enabled: { type: Boolean, default: true },
      requireTableSelection: { type: Boolean, default: true },
      logoOnQr: { type: Boolean, default: true },
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    payment: {
      gateway: { type: String, default: null }, // no integration this phase
      codEnabled: { type: Boolean, default: true },
    },
  },
  { _id: false },
);

/** First-login onboarding wizard progress. */
const onboardingStateSchema = new Schema(
  {
    started: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    completedSteps: { type: [{ type: String, enum: ONBOARDING_STEPS }], default: [] },
  },
  { _id: false },
);

/**
 * Restaurant: a brand outlet group under an organization. Tenant-scoped
 * (organizationId). Contains branches, staff, menus, orders (later modules).
 */
const restaurantSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    type: { type: String, enum: Object.values(RESTAURANT_TYPE), default: RESTAURANT_TYPE.QSR },
    cuisines: { type: [String], default: [] },
    address: { type: addressSchema(), default: () => ({}) },

    status: {
      type: String,
      enum: Object.values(RESTAURANT_STATUS),
      default: RESTAURANT_STATUS.ONBOARDING,
      index: true,
    },

    settings: { type: restaurantSettingsSchema, default: () => ({}) },
    onboarding: { type: onboardingStateSchema, default: () => ({}) },

    managerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

// Tenant-scoped uniqueness + query indexes.
restaurantSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
restaurantSchema.index({ organizationId: 1, status: 1 });
restaurantSchema.index({ organizationId: 1, createdAt: -1 });
restaurantSchema.index({ deletedAt: 1 });

export const Restaurant =
  mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);

export default Restaurant;
