import mongoose from 'mongoose';

import {
  PROVIDER,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../constants/payment.constants.js';
import { baseSchemaOptions, moneyField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Transaction: the IMMUTABLE financial ledger. Every payment operation
 * (authorization / capture / refund / void / failure) appends exactly one
 * transaction. Transactions are NEVER edited after creation — corrections are
 * new, offsetting transactions. This is the audit-grade financial history.
 * Integer minor units.
 */
const transactionSchema = new Schema(
  {
    ...tenantFields,

    /** Internal, human-safe, unique reference (never a Mongo id). */
    internalTxnId: { type: String, required: true, unique: true },
    providerTxnId: { type: String, default: null },
    gatewayReference: { type: String, default: null },

    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null, index: true },
    refundId: { type: Schema.Types.ObjectId, ref: 'Refund', default: null },

    type: { type: String, enum: Object.values(TRANSACTION_TYPE), required: true },
    amount: moneyField(0),
    currency: { type: String, default: 'INR' },
    provider: { type: String, enum: Object.values(PROVIDER), default: null },

    status: { type: String, enum: Object.values(TRANSACTION_STATUS), required: true },
    failureReason: { type: String, default: null },

    /** Non-secret snapshot of the provider response for reconciliation. */
    providerResponse: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  // Immutable: no soft delete, no updatedAt semantics beyond creation.
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

transactionSchema.index({ internalTxnId: 1 }, { unique: true });
transactionSchema.index({ restaurantId: 1, type: 1, createdAt: -1 });
transactionSchema.index({ branchId: 1, createdAt: -1 });
transactionSchema.index({ paymentId: 1, createdAt: -1 });
transactionSchema.index({ orderId: 1, createdAt: -1 });
transactionSchema.index({ providerTxnId: 1 });

// Guard: block updates at the model level (defense in depth; repo also enforces).
transactionSchema.pre('findOneAndUpdate', function blockUpdate(next) {
  next(new Error('Transactions are immutable and cannot be updated'));
});
transactionSchema.pre('updateOne', function blockUpdate(next) {
  next(new Error('Transactions are immutable and cannot be updated'));
});

export const Transaction =
  mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export default Transaction;
