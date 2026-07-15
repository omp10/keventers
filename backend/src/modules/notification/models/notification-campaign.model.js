import mongoose from 'mongoose';

import {
  CAMPAIGN_STATUS,
  CATEGORY,
  CHANNEL,
} from '../constants/notification.constants.js';
import { baseSchemaOptions, softDeleteField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Notification campaign — a restaurant-scoped bulk/marketing send to a customer
 * SEGMENT. This phase persists the definition + reporting counters + a schedule;
 * full audience-execution (segmentation queries, batched fan-out) plugs into the
 * same outbox/delivery pipeline via the campaign service. Marketing respects
 * per-customer opt-in at dispatch.
 */
const campaignSchema = new Schema(
  {
    ...tenantFields,

    name: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: null, maxlength: 500 },
    category: { type: String, enum: Object.values(CATEGORY), default: CATEGORY.MARKETING },
    channels: [{ type: String, enum: Object.values(CHANNEL) }],
    templateKey: { type: String, required: true },

    // Segment selection criteria (evaluated by the campaign service later).
    segment: {
      tiers: [{ type: String }],
      minLifetimeSpend: { type: Number, default: null },
      inactiveDays: { type: Number, default: null },
      tags: [{ type: String }],
    },
    variables: { type: Schema.Types.Mixed, default: () => ({}) },

    status: { type: String, enum: Object.values(CAMPAIGN_STATUS), default: CAMPAIGN_STATUS.DRAFT, index: true },
    scheduledAt: { type: Date, default: null },

    // Reporting counters.
    stats: {
      targeted: { type: Number, default: 0 },
      queued: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

campaignSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
campaignSchema.index({ status: 1, scheduledAt: 1 });

export const NotificationCampaign =
  mongoose.models.NotificationCampaign || mongoose.model('NotificationCampaign', campaignSchema);

export default NotificationCampaign;
