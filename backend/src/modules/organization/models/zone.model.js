import mongoose from 'mongoose';

import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

export const ZONE_STATUS = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  INACTIVE: 'inactive',
});

export const ZONE_TYPE = Object.freeze({
  DELIVERY: 'delivery',
  SERVICE: 'service',
});

/**
 * Zone: an ADMIN-DEFINED operating area (delivery/service coverage) expressed
 * as a circle — a center point plus a radius. Circles (not polygons) keep the
 * admin UX to "drop a pin, set km", which covers the real operating model and
 * is trivially checkable server-side.
 *
 * Serviceability decisions stay BACKEND-owned; zones are the data those
 * decisions read, and the customer app only renders what it's told.
 */
const zoneSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    code: { type: String, trim: true, uppercase: true, default: '' },
    city: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    type: { type: String, enum: Object.values(ZONE_TYPE), default: ZONE_TYPE.DELIVERY },
    /** Circle center — GeoJSON Point [lng, lat]. */
    center: {
      type: new Schema(
        {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: { type: [Number], required: true }, // [lng, lat]
        },
        { _id: false },
      ),
      required: true,
    },
    radiusKm: { type: Number, required: true, min: 0.1, max: 100, default: 5 },
    /** Optional delivery economics (backend applies them; never the client). */
    deliveryFee: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    etaMinutes: { type: Number, default: null },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(ZONE_STATUS),
      default: ZONE_STATUS.ACTIVE,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

zoneSchema.index({ center: '2dsphere' });
zoneSchema.index({ status: 1, sortOrder: 1 });
zoneSchema.index({ city: 1 });
zoneSchema.index({ deletedAt: 1 });

export const Zone = mongoose.models.Zone || mongoose.model('Zone', zoneSchema);

export default Zone;
