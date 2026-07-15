import mongoose from 'mongoose';

import { ENVIRONMENT, PAYMENT_METHOD, PROVIDER } from '../constants/payment.constants.js';
import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * RestaurantPaymentConfig: a restaurant's provider configuration. Different
 * restaurants may use different providers simultaneously. Merchant credentials
 * are ENCRYPTED at rest (AES-256-GCM via the Security Platform) — the raw values
 * NEVER touch the database and are never returned by any DTO. `select: false`
 * keeps the ciphertext out of ordinary reads. Scoped to organization +
 * restaurant.
 */
const configSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },

    provider: { type: String, enum: Object.values(PROVIDER), required: true },
    environment: { type: String, enum: Object.values(ENVIRONMENT), default: ENVIRONMENT.TEST },

    // --- ENCRYPTED credentials (ciphertext only; never plaintext) ---
    merchantIdEnc: { type: String, default: null, select: false },
    apiKeyEnc: { type: String, default: null, select: false },
    secretKeyEnc: { type: String, default: null, select: false },
    webhookSecretEnc: { type: String, default: null, select: false },

    /** Non-secret provider extras (e.g. PhonePe saltIndex). */
    extra: { type: Schema.Types.Mixed, default: () => ({}) },

    /** Methods the restaurant enables (subset of what the provider supports). */
    enabledMethods: { type: [{ type: String, enum: Object.values(PAYMENT_METHOD) }], default: [] },

    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

configSchema.index({ organizationId: 1, restaurantId: 1, provider: 1 }, { unique: true });
configSchema.index({ restaurantId: 1, isActive: 1 });
configSchema.index({ deletedAt: 1 });

export const RestaurantPaymentConfig =
  mongoose.models.RestaurantPaymentConfig ||
  mongoose.model('RestaurantPaymentConfig', configSchema);

export default RestaurantPaymentConfig;
