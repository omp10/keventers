import mongoose from 'mongoose';

import { REFERRAL_STATUS } from '../constants/customer.constants.js';
import { baseSchemaOptions, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Referral (DESIGN-ONLY for this phase). A referrer customer owns a shareable
 * code; when a referee qualifies, both may receive rewards. Campaign EXECUTION
 * (auto-granting, fraud checks, multi-touch attribution) is a later phase — the
 * data model + status machine + tracking fields are in place so it plugs in
 * without redesign.
 */
const referralSchema = new Schema(
  {
    ...tenantFields,

    code: { type: String, required: true, uppercase: true, trim: true },
    referrerCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    referrerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Set once a referee redeems the code.
    refereeCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    refereeUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    status: { type: String, enum: Object.values(REFERRAL_STATUS), default: REFERRAL_STATUS.PENDING, index: true },

    // Reward intents (granted by a future campaign engine).
    referrerRewardPoints: { type: Number, default: 0 },
    refereeRewardPoints: { type: Number, default: 0 },
    referrerGranted: { type: Boolean, default: false },
    refereeGranted: { type: Boolean, default: false },

    // Tracking / attribution.
    channel: { type: String, default: null }, // 'link' | 'sms' | 'whatsapp' | …
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  baseSchemaOptions,
);

// A code is unique within a restaurant.
referralSchema.index({ restaurantId: 1, code: 1 }, { unique: true });
referralSchema.index({ referrerCustomerId: 1, status: 1 });
referralSchema.index({ refereeUserId: 1 });

export const Referral = mongoose.models.Referral || mongoose.model('Referral', referralSchema);

export default Referral;
