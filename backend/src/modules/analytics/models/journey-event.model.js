import mongoose from 'mongoose';

import { baseSchemaOptions } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * JourneyEvent — one customer-journey step (scan → browse → cart → order),
 * ingested from the customer app's analytics sink. This is the raw material for
 * the dashboard's per-customer journey timeline ("this customer scanned, opened
 * two products, stalled at payment").
 *
 * Tenant fields are NULLABLE: entry events (scan, OTP) fire before an outlet is
 * known. `journeyId` is the client-generated id that stitches a visit together;
 * once the outlet resolves, later events carry the tenant and the whole journey
 * is discoverable through them.
 *
 * PII stance: `customerPhone` is the only identity field, present only after
 * OTP; properties are whatever the vocabulary emits (slugs + ids, not payloads).
 */
const journeyEventSchema = new Schema(
  {
    journeyId: { type: String, required: true },

    organizationId: { type: Schema.Types.ObjectId, default: null },
    restaurantId: { type: Schema.Types.ObjectId, default: null },
    branchId: { type: Schema.Types.ObjectId, default: null },
    outletSlug: { type: String, default: null },

    guestSessionId: { type: String, default: null },
    customerPhone: { type: String, default: null },

    event: { type: String, required: true, maxlength: 60 },
    /** Funnel depth (see STAGE_OF) — lets "stage reached" be a $max, not a re-parse. */
    stage: { type: Number, default: 0 },
    properties: { type: Schema.Types.Mixed, default: () => ({}) },
    at: { type: Date, required: true },
  },
  baseSchemaOptions,
);

journeyEventSchema.index({ journeyId: 1, at: 1 });
journeyEventSchema.index({ restaurantId: 1, branchId: 1, at: -1 });
// Raw events are working data, not an archive — expire after 90 days.
journeyEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export const JourneyEvent =
  mongoose.models.JourneyEvent || mongoose.model('JourneyEvent', journeyEventSchema);

export default JourneyEvent;
