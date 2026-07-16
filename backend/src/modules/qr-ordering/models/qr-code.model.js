import mongoose from 'mongoose';

import { QR_STATUS, QR_TYPE } from '../constants/qr.constants.js';
import { baseSchemaOptions, softDeleteField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * QrCode: the secure QR credential bound to one table within one branch. It
 * stores the unguessable public `token` (the scan lookup key) — NOT just a URL.
 * The scannable code is HMAC-signed with the server secret at `secretVersion`;
 * regeneration mints a new token, rotating the secret version invalidates every
 * previously printed code. Supports permanent vs temporary (expiring) codes and
 * activation toggling.
 */
const qrCodeSchema = new Schema(
  {
    ...tenantFields,

    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true, index: true },

    /** Public lookup token embedded in the scannable code (unique, unguessable). */
    token: { type: String, required: true, unique: true },
    /** Signature version; bumping it (rotate) invalidates all old printed codes. */
    secretVersion: { type: Number, default: 1 },

    /** The scannable code (`token.signature`) and the URL the image encodes. */
    code: { type: String, required: true },
    scanUrl: { type: String, required: true },

    /** Stored QR image (via the Storage Platform); optional/best-effort. */
    imageUrl: { type: String, default: null },
    imageKey: { type: String, default: null },

    type: { type: String, enum: Object.values(QR_TYPE), default: QR_TYPE.PERMANENT },
    status: {
      type: String,
      enum: Object.values(QR_STATUS),
      default: QR_STATUS.ACTIVE,
      index: true,
    },
    /** Temporary QR expiry (null = never, for permanent codes). */
    expiresAt: { type: Date, default: null },

    // Usage telemetry (helps analytics / abuse detection later).
    scanCount: { type: Number, default: 0 },
    lastScannedAt: { type: Date, default: null },
    generatedAt: { type: Date, default: () => new Date() },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

// The token is the hot scan lookup — unique + indexed. One active QR per table.
qrCodeSchema.index({ tableId: 1, status: 1 });
qrCodeSchema.index({ branchId: 1, status: 1 });
qrCodeSchema.index({ expiresAt: 1 });
qrCodeSchema.index({ deletedAt: 1 });

export const QrCode = mongoose.models.QrCode || mongoose.model('QrCode', qrCodeSchema);

export default QrCode;
