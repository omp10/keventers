import mongoose from 'mongoose';

import { INTENT_STATUS, PAYMENT_METHOD, PROVIDER } from '../constants/payment.constants.js';
import { baseSchemaOptions, moneyField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * PaymentIntent: the entry point of every payment. Created for an order (or a
 * partial tender of it), bound to the selected provider. The amount is taken
 * from the order's immutable Pricing-Engine snapshot — the intent NEVER
 * calculates it. Integer minor units.
 */
const paymentIntentSchema = new Schema(
  {
    ...tenantFields,
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true },
    sessionId: { type: String, default: null, index: true },
    customerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    provider: { type: String, enum: Object.values(PROVIDER), required: true },
    method: { type: String, enum: Object.values(PAYMENT_METHOD), default: null },

    amount: moneyField(0),
    currency: { type: String, default: 'INR' },

    status: { type: String, enum: Object.values(INTENT_STATUS), default: INTENT_STATUS.CREATED, index: true },

    /** Provider handle (Razorpay order id / PhonePe merchantTransactionId). */
    providerIntentRef: { type: String, default: null, index: true },
    /** Non-secret payload the client SDK uses to complete payment. */
    checkoutPayload: { type: Schema.Types.Mixed, default: null },

    idempotencyKey: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    version: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  baseSchemaOptions,
);

paymentIntentSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
paymentIntentSchema.index({ orderId: 1, status: 1 });
paymentIntentSchema.index(
  { orderId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

export const PaymentIntent =
  mongoose.models.PaymentIntent || mongoose.model('PaymentIntent', paymentIntentSchema);

export default PaymentIntent;
