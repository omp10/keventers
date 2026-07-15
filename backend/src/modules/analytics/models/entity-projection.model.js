import mongoose from 'mongoose';

import { ALL_DOMAINS, ENTITY_TYPE } from '../constants/analytics.constants.js';
import { baseSchemaOptions, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * EntityProjection — the generic per-entity counter powering leaderboard-style
 * dashboards: best/worst products, product/category revenue, modifier/add-on
 * usage, chef + station performance, table utilization, payment-provider
 * distribution, notification-channel performance. One doc per
 * (scope, domain, entityType, entityId). Sort by a `metrics` key for top/bottom N.
 * A denormalized `name` label enables display without touching business data.
 */
const entityProjectionSchema = new Schema(
  {
    ...tenantFields,
    domain: { type: String, enum: ALL_DOMAINS, required: true },
    entityType: { type: String, enum: Object.values(ENTITY_TYPE), required: true },
    entityId: { type: String, required: true }, // productId / chefId / stationId / 'razorpay' / 'email' …
    name: { type: String, default: null },

    metrics: { type: Schema.Types.Mixed, default: () => ({}) },
    lastEventAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

entityProjectionSchema.index(
  { organizationId: 1, restaurantId: 1, branchId: 1, domain: 1, entityType: 1, entityId: 1 },
  { unique: true },
);
// Leaderboard reads (top/bottom by a metric within a scope + type).
entityProjectionSchema.index({ restaurantId: 1, domain: 1, entityType: 1 });

export const EntityProjection =
  mongoose.models.EntityProjection || mongoose.model('EntityProjection', entityProjectionSchema);

export default EntityProjection;
