import mongoose from 'mongoose';

import { ALL_DOMAINS, PERIOD } from '../constants/analytics.constants.js';
import { baseSchemaOptions, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * TimeBucketProjection — the generic time-series counter powering every
 * time-based dashboard (revenue/orders/payments/notifications/qr by
 * hour/day/week/month/year + lifetime). One doc per
 * (scope, domain, period, periodKey). `metrics` is a flexible numeric map
 * incremented atomically via `$inc`; averages are derived from sum+count pairs at
 * read time (never stored as a mutable average). `hourly`/`weekday` histograms on
 * DAY/higher docs feed peak-hour / peak-day analysis without scanning orders.
 *
 * This collection is READ-OPTIMIZED: dashboards read a compact indexed
 * (scope, domain, period, periodKey-range) slice — never the transaction history.
 */
const timeBucketSchema = new Schema(
  {
    ...tenantFields,
    domain: { type: String, enum: ALL_DOMAINS, required: true },
    period: { type: String, enum: Object.values(PERIOD), required: true },
    periodKey: { type: String, required: true }, // e.g. '2026-07-15', '2026-W29'

    metrics: { type: Schema.Types.Mixed, default: () => ({}) },
    // Optional peak histograms (maintained on day+ buckets).
    hourly: { type: [Number], default: undefined }, // 24 slots: order/scan counts
    weekday: { type: [Number], default: undefined }, // 7 slots
  },
  baseSchemaOptions,
);

// One bucket per (scope, domain, period, periodKey). branchId null → restaurant-level.
timeBucketSchema.index(
  { organizationId: 1, restaurantId: 1, branchId: 1, domain: 1, period: 1, periodKey: 1 },
  { unique: true },
);
// Range reads for a domain (indexed periodKey scan within a period).
timeBucketSchema.index({ restaurantId: 1, domain: 1, period: 1, periodKey: 1 });
timeBucketSchema.index({ organizationId: 1, domain: 1, period: 1, periodKey: 1 });

export const TimeBucketProjection =
  mongoose.models.TimeBucketProjection || mongoose.model('TimeBucketProjection', timeBucketSchema);

export default TimeBucketProjection;
