import mongoose from 'mongoose';

import { TABLE_SHAPE, TABLE_STATUS } from '../constants/qr.constants.js';
import { baseSchemaOptions, softDeleteField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Table: a physical table within a branch. Branch-scoped (+ optional floor /
 * zone group). Carries seating capacity, operational status, a reservation flag
 * and metadata. Its QR assignment lives in the QrCode collection (a table has at
 * most one active QR); `activeQrCodeId` is denormalised for fast lookups.
 */
const tableSchema = new Schema(
  {
    ...tenantFields,

    /** Optional grouping (floor/zone/section). */
    groupId: { type: Schema.Types.ObjectId, ref: 'TableGroup', default: null, index: true },
    floor: { type: String, trim: true, default: '' },
    zone: { type: String, trim: true, default: '' },

    /** Human-facing identifier, unique within the branch (e.g. "T-12", "A4"). */
    number: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: '' },

    seatingCapacity: { type: Number, default: 2, min: 1 },
    shape: { type: String, enum: Object.values(TABLE_SHAPE), default: TABLE_SHAPE.SQUARE },

    status: {
      type: String,
      enum: Object.values(TABLE_STATUS),
      default: TABLE_STATUS.AVAILABLE,
      index: true,
    },
    /** Reservation flag (a lightweight marker; full reservations are a future
     * module — this just blocks QR ordering while the table is held). */
    isReserved: { type: Boolean, default: false },
    /** Whether the table accepts QR ordering at all (independent of live status). */
    isOrderingEnabled: { type: Boolean, default: true },

    /** Denormalised pointer to the table's current active QR code. */
    activeQrCodeId: { type: Schema.Types.ObjectId, ref: 'QrCode', default: null },

    /** Live occupancy pointer (best-effort mirror of Redis occupancy). */
    currentSessionId: { type: String, default: null },
    occupiedAt: { type: Date, default: null },

    displayOrder: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

// Tenant-scoped uniqueness + hot query paths.
tableSchema.index(
  { organizationId: 1, restaurantId: 1, branchId: 1, number: 1 },
  { unique: true },
);
tableSchema.index({ branchId: 1, status: 1 });
tableSchema.index({ branchId: 1, groupId: 1, displayOrder: 1 });
tableSchema.index({ deletedAt: 1 });

export const Table = mongoose.models.Table || mongoose.model('Table', tableSchema);

export default Table;
