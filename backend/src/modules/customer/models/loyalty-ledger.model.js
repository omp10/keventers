import mongoose from 'mongoose';

import {
  LOYALTY_SOURCE,
  LOYALTY_TXN_TYPE,
} from '../constants/customer.constants.js';
import { baseSchemaOptions, pointsField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Loyalty ledger — the IMMUTABLE source of truth for points. Every earn, redeem,
 * adjustment, expiration, bonus or reversal appends exactly one entry; the
 * account balance is the signed sum of `points`. Entries are NEVER edited —
 * corrections are new, offsetting entries. `balanceAfter` snapshots the running
 * balance for O(1) statement rendering.
 *
 * Idempotency: `(customerId, source.type, source.id)` is unique (partial), so a
 * replayed PaymentCaptured / RefundCompleted / reward redemption can never
 * double-post. Immutability is enforced at BOTH the model (pre-hooks) and
 * repository layers.
 */
const ledgerSchema = new Schema(
  {
    ...tenantFields,
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    reference: { type: String, required: true }, // human-safe LP-… ref
    type: { type: String, enum: Object.values(LOYALTY_TXN_TYPE), required: true },

    /** Signed points delta (+earn/bonus, −redeem/expire, ± adjust/reversal). */
    points: pointsField(0),
    /** Running balance immediately AFTER this entry was applied. */
    balanceAfter: pointsField(0),

    source: {
      type: { type: String, enum: Object.values(LOYALTY_SOURCE), required: true },
      id: { type: String, default: null }, // natural id: paymentId / refundId / rewardId / etc.
    },

    // Optional links for reporting / reconciliation.
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    rewardId: { type: Schema.Types.ObjectId, ref: 'Reward', default: null },
    campaignId: { type: String, default: null },

    /** For EARN/BONUS: when these points expire (null = never). */
    expiresAt: { type: Date, default: null, index: true },
    /** For EXPIRE entries: the earning entry that aged out. */
    expiredFrom: { type: Schema.Types.ObjectId, ref: 'LoyaltyLedger', default: null },

    reason: { type: String, default: null, maxlength: 240 },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // staff who made a manual adjustment
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  // Immutable: created once, never updated.
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// Idempotency backstop — one entry per (customer, source) where a source id is set.
ledgerSchema.index(
  { customerId: 1, 'source.type': 1, 'source.id': 1 },
  { unique: true, partialFilterExpression: { 'source.id': { $type: 'string' } } },
);
// Statement rendering + reporting.
ledgerSchema.index({ customerId: 1, createdAt: -1 });
ledgerSchema.index({ restaurantId: 1, type: 1, createdAt: -1 });
// Expiration sweep: unspent, non-expired earn/bonus entries past their date.
ledgerSchema.index({ expiresAt: 1, type: 1 });

// Immutability guards (defense in depth alongside the repository overrides).
ledgerSchema.pre('findOneAndUpdate', function blockUpdate(next) {
  next(new Error('Loyalty ledger entries are immutable and cannot be updated'));
});
ledgerSchema.pre('updateOne', function blockUpdate(next) {
  next(new Error('Loyalty ledger entries are immutable and cannot be updated'));
});
ledgerSchema.pre('updateMany', function blockUpdate(next) {
  next(new Error('Loyalty ledger entries are immutable and cannot be updated'));
});

export const LoyaltyLedger =
  mongoose.models.LoyaltyLedger || mongoose.model('LoyaltyLedger', ledgerSchema);

export default LoyaltyLedger;
