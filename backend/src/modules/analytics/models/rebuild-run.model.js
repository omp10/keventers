import mongoose from 'mongoose';

import {
  REBUILD_STATUS,
  REBUILD_TYPE,
  RECON_STATUS,
} from '../constants/analytics.constants.js';
import { baseSchemaOptions, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * RebuildRun — an audit record of a projection rebuild / reconciliation. Rebuilds
 * recompute projections from authoritative transactional data (the ONLY sanctioned
 * path that reads business collections). Reconciliation compares projections vs
 * authoritative sums and REPORTS mismatches WITHOUT mutating data. Every run is
 * tracked here + audit-logged.
 */
const rebuildRunSchema = new Schema(
  {
    ...tenantFields,
    type: { type: String, enum: Object.values(REBUILD_TYPE), required: true },
    domain: { type: String, default: null }, // null = all applicable domains
    status: { type: String, enum: Object.values(REBUILD_STATUS), default: REBUILD_STATUS.RUNNING, index: true },

    range: { from: { type: Date, default: null }, to: { type: Date, default: null } },
    processed: { type: Number, default: 0 },
    projectionsWritten: { type: Number, default: 0 },

    // Reconciliation outcome.
    reconStatus: { type: String, enum: Object.values(RECON_STATUS), default: null },
    mismatches: { type: [Schema.Types.Mixed], default: [] }, // [{ metric, projected, authoritative, diff }]

    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    error: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
  },
  baseSchemaOptions,
);

rebuildRunSchema.index({ restaurantId: 1, type: 1, createdAt: -1 });
rebuildRunSchema.index({ status: 1, createdAt: -1 });

export const RebuildRun =
  mongoose.models.RebuildRun || mongoose.model('RebuildRun', rebuildRunSchema);

export default RebuildRun;
