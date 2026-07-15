import mongoose from 'mongoose';

import {
  GUEST_IDENTITY,
  SESSION_STATUS,
} from '../constants/qr.constants.js';
import { baseSchemaOptions, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/** A device attached to the session (multi-device support). */
const deviceSchema = new Schema(
  {
    deviceId: { type: String, default: null },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

/**
 * GuestSession: the PRIMARY customer identity for the entire ordering journey.
 * The Cart, Order, Kitchen and Payment modules reference `sessionId` (not just a
 * customerId), so a guest can stay anonymous, log in mid-journey, recover after
 * a refresh, or share a table (multiple sessions per table) without any of those
 * modules being redesigned. Redis holds the LIVE session (fast, TTL'd); this
 * collection is the durable HISTORY. Branch-scoped.
 *
 * NOTE: soft-delete is intentionally NOT used — sessions are historical records
 * that reach terminal states (completed/expired/terminated), never deleted.
 */
const guestSessionSchema = new Schema(
  {
    ...tenantFields,

    /** Stable public session identifier (the ordering-journey key). */
    sessionId: { type: String, required: true, unique: true },

    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true, index: true },
    qrCodeId: { type: Schema.Types.ObjectId, ref: 'QrCode', default: null },

    /** Anonymous guest handle (always present, even for logged-in customers). */
    guestId: { type: String, required: true, index: true },
    identityType: {
      type: String,
      enum: Object.values(GUEST_IDENTITY),
      default: GUEST_IDENTITY.ANONYMOUS,
    },
    /** Set when the session is associated with a registered account (may happen
     * mid-journey WITHOUT losing session history). */
    customerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    guestName: { type: String, trim: true, default: '' },
    guestCount: { type: Number, default: 1, min: 1 },

    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.CREATED,
      index: true,
    },
    statusHistory: {
      type: [
        new Schema(
          { status: { type: String }, at: { type: Date, default: () => new Date() } },
          { _id: false },
        ),
      ],
      default: [],
    },

    /** Recovery handle (opaque) for session recovery after a refresh/device swap. */
    recoveryCode: { type: String, default: null, index: true },

    device: { type: deviceSchema, default: () => ({}) },
    devices: { type: [deviceSchema], default: [] },

    lastActivityAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    endedReason: { type: String, default: null },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  baseSchemaOptions,
);

guestSessionSchema.index({ sessionId: 1 }, { unique: true });
guestSessionSchema.index({ branchId: 1, status: 1, createdAt: -1 });
guestSessionSchema.index({ tableId: 1, status: 1 });
guestSessionSchema.index({ restaurantId: 1, createdAt: -1 });
guestSessionSchema.index({ recoveryCode: 1 });
// TTL-free expiry index (queried by sweeps; sessions are kept as history).
guestSessionSchema.index({ expiresAt: 1 });

export const GuestSession =
  mongoose.models.GuestSession || mongoose.model('GuestSession', guestSessionSchema);

export default GuestSession;
