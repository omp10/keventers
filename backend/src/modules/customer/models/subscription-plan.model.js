import mongoose from 'mongoose';

import { baseSchemaOptions, moneyField, softDeleteField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

export const SUBSCRIPTION_PLAN_STATUS = Object.freeze({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
});

/**
 * SubscriptionPlan — an admin-authored, restaurant-scoped plan the customer app
 * offers after ordering ("5 Milkshakes Monthly", "Office Subscription", …).
 * Fully CMS-managed: name, price, period, item quota and the perk lines are all
 * data, so the business creates/edits plans from the dashboard with no deploy.
 */
const subscriptionPlanSchema = new Schema(
  {
    ...tenantFields,

    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: null, maxlength: 500 },

    /** Price for one period, minor units. */
    price: moneyField(0),
    currency: { type: String, default: 'INR' },

    /** Length of one period in days (30 = monthly). */
    periodDays: { type: Number, required: true, min: 1, max: 365, default: 30 },

    /** Items included per period (5 shakes…); 0 = unlimited / perk-only plan. */
    itemQuota: { type: Number, default: 0, min: 0 },

    /** Display perk lines ("Priority ordering", "Birthday rewards", …). */
    perks: { type: [String], default: [] },

    status: { type: String, enum: Object.values(SUBSCRIPTION_PLAN_STATUS), default: SUBSCRIPTION_PLAN_STATUS.ACTIVE, index: true },
    displayOrder: { type: Number, default: 0 },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

subscriptionPlanSchema.index({ organizationId: 1, restaurantId: 1, status: 1, displayOrder: 1 });

export const SubscriptionPlan =
  mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
