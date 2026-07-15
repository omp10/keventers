import mongoose from 'mongoose';

import { PROVIDER, SETTLEMENT_STATUS } from '../constants/payment.constants.js';
import { baseSchemaOptions, moneyField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Settlement: an ABSTRACTION (per the phase scope) for restaurant/platform
 * payouts. Groups captured payments over a period, computing gross, commission,
 * taxes and net (all integer minor units). No real payout is performed here — a
 * future settlement provider executes it via the SettlementProvider interface.
 */
const settlementSchema = new Schema(
  {
    ...tenantFields,
    provider: { type: String, enum: Object.values(PROVIDER), default: null },

    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    grossAmount: moneyField(0),
    commissionAmount: moneyField(0),
    taxAmount: moneyField(0),
    netAmount: moneyField(0),
    currency: { type: String, default: 'INR' },

    /** Payments included in this settlement (immutable once completed). */
    paymentIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Payment' }], default: [] },
    paymentCount: { type: Number, default: 0 },

    status: { type: String, enum: Object.values(SETTLEMENT_STATUS), default: SETTLEMENT_STATUS.PENDING, index: true },
    reference: { type: String, default: null },
    completedAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  baseSchemaOptions,
);

settlementSchema.index({ restaurantId: 1, status: 1, periodEnd: -1 });
settlementSchema.index({ organizationId: 1, periodEnd: -1 });

export const Settlement = mongoose.models.Settlement || mongoose.model('Settlement', settlementSchema);

export default Settlement;
