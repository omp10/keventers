import mongoose from 'mongoose';

const { Schema } = mongoose;

export const OTP_PURPOSE = Object.freeze({
  LOGIN: 'login',
});

/**
 * OtpChallenge: a pending phone verification.
 *
 * The code is NEVER stored in the clear — only a hash — so a database leak can't
 * be replayed. One live challenge per (phone, purpose): requesting again updates
 * the same document, which makes the resend cooldown and attempt cap trivially
 * enforceable. Mongo's TTL monitor reaps expired challenges automatically.
 */
const otpChallengeSchema = new Schema(
  {
    phone: { type: String, required: true, trim: true, index: true },
    purpose: { type: String, enum: Object.values(OTP_PURPOSE), default: OTP_PURPOSE.LOGIN },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    /** Wrong-code attempts against this challenge (capped to stop brute force). */
    attempts: { type: Number, default: 0 },
    /** Drives the resend cooldown. */
    lastSentAt: { type: Date, default: Date.now },
    /** How many codes were sent for this phone in the current window. */
    sendCount: { type: Number, default: 1 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

otpChallengeSchema.index({ phone: 1, purpose: 1 }, { unique: true });
// TTL: Mongo removes the document once `expiresAt` passes.
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpChallenge =
  mongoose.models.OtpChallenge || mongoose.model('OtpChallenge', otpChallengeSchema);

export default OtpChallenge;
