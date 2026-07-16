import mongoose from 'mongoose';

import {
  ORGANIZATION_STATUS,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
} from '../constants/organization.constants.js';
import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/** Embedded subscription (no payment-gateway integration in this phase). */
const subscriptionSchema = new Schema(
  {
    plan: { type: String, enum: Object.values(SUBSCRIPTION_PLAN), default: SUBSCRIPTION_PLAN.TRIAL },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.TRIAL,
    },
    trialStartedAt: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    maxRestaurants: { type: Number, default: 1 },
    maxBranches: { type: Number, default: 3 },
  },
  { _id: false },
);

/** Organization-level settings/preferences. */
const orgSettingsSchema = new Schema(
  {
    defaultCurrency: { type: String, default: 'INR' },
    defaultTimezone: { type: String, default: 'Asia/Kolkata' },
    locale: { type: String, default: 'en-IN' },
  },
  { _id: false },
);

/**
 * Organization: the SaaS tenant. Owns restaurants, memberships, a subscription,
 * and settings. The root of the multi-tenancy hierarchy.
 */
const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    brandName: { type: String, trim: true, default: '' },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'OnboardingApplication', default: null },

    status: {
      type: String,
      enum: Object.values(ORGANIZATION_STATUS),
      default: ORGANIZATION_STATUS.ONBOARDING,
      index: true,
    },

    contact: {
      email: { type: String, trim: true, lowercase: true, default: '' },
      phone: { type: String, trim: true, default: '' },
    },

    subscription: { type: subscriptionSchema, default: () => ({}) },
    settings: { type: orgSettingsSchema, default: () => ({}) },

    suspendedAt: { type: Date, default: null },
    suspensionReason: { type: String, trim: true, default: '' },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

organizationSchema.index({ status: 1, createdAt: -1 });
organizationSchema.index({ deletedAt: 1 });

export const Organization =
  mongoose.models.Organization || mongoose.model('Organization', organizationSchema);

export default Organization;
