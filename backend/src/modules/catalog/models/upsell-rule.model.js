import mongoose from 'mongoose';

import { baseSchemaOptions, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * UpsellRule — an ADMIN-authored suggestion the recommendation engine blends
 * with what it learns from order history. The SOW's "Upsell Rules" CMS line:
 * "always suggest waffles with any shake", "push the seasonal special after
 * 8pm". Pure data — the business tunes selling with no deploy.
 */
const upsellRuleSchema = new Schema(
  {
    ...tenantFields,

    /** Products that trigger this rule; EMPTY = fires for any cart/product. */
    triggerProductIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    /** The product to suggest. */
    suggestProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },

    /** How strongly to boost (1–100). Learned co-occurrence tops out at ~50. */
    weight: { type: Number, default: 50, min: 1, max: 100 },

    /** Optional daily time window (hours, 0–23). Both unset = always. */
    startHour: { type: Number, default: null, min: 0, max: 23 },
    endHour: { type: Number, default: null, min: 0, max: 23 },

    label: { type: String, default: null, maxlength: 60 }, // e.g. "Seasonal special"
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

upsellRuleSchema.index({ organizationId: 1, restaurantId: 1, isActive: 1 });

export const UpsellRule = mongoose.models.UpsellRule || mongoose.model('UpsellRule', upsellRuleSchema);

export default UpsellRule;
