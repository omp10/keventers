import mongoose from 'mongoose';

import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PROVIDER,
} from '../constants/payment.constants.js';
import { baseSchemaOptions, moneyField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/** A single attempt against the gateway (retries / re-tries). */
const attemptSchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    status: { type: String, default: '' },
    providerPaymentRef: { type: String, default: null },
    failureReason: { type: String, default: null },
  },
  { _id: false },
);

/**
 * Payment: ONE tender against an order. Multi-payment is first-class — an order
 * can have many payments (₹800 PhonePe + ₹200 cash). The amount comes from the
 * order snapshot / a partial split; it is never recalculated. Integer minor
 * units. Optimistically versioned; the immutable ledger lives in Transactions.
 */
const paymentSchema = new Schema(
  {
    ...tenantFields,
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true },
    intentId: { type: Schema.Types.ObjectId, ref: 'PaymentIntent', default: null },
    sessionId: { type: String, default: null, index: true },
    customerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    provider: { type: String, enum: Object.values(PROVIDER), required: true },
    method: { type: String, enum: Object.values(PAYMENT_METHOD), default: null },

    amount: moneyField(0),
    currency: { type: String, default: 'INR' },
    refundedAmount: moneyField(0),

    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING, index: true },

    providerPaymentRef: { type: String, default: null, index: true },
    attempts: { type: [attemptSchema], default: [] },
    failureReason: { type: String, default: null },

    authorizedAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },

    version: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  baseSchemaOptions,
);

paymentSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ branchId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ providerPaymentRef: 1 });
paymentSchema.index({ customerUserId: 1, createdAt: -1 });
paymentSchema.index({ sessionId: 1, createdAt: -1 });

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default Payment;
