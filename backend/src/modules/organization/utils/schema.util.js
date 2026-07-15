import mongoose from 'mongoose';

import { DAYS_OF_WEEK } from '../constants/organization.constants.js';

const { Schema } = mongoose;

/** Shared schema options: timestamps, soft-delete-friendly JSON transform. */
export const baseSchemaOptions = Object.freeze({
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      delete ret._id;
      return ret;
    },
  },
  toObject: { virtuals: true },
});

export const softDeleteField = Object.freeze({
  deletedAt: { type: Date, default: null },
});

/** Reusable address sub-schema (factory to avoid shared-instance surprises). */
export function addressSchema() {
  return new Schema(
    {
      line1: { type: String, trim: true, default: '' },
      line2: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'India' },
      pincode: { type: String, trim: true, default: '' },
      geo: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
    },
    { _id: false },
  );
}

/** Per-day business hours (open/close as "HH:mm", or closed). */
export function businessHoursSchema() {
  return new Schema(
    {
      day: { type: String, enum: DAYS_OF_WEEK, required: true },
      isOpen: { type: Boolean, default: true },
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
    },
    { _id: false },
  );
}

/** Uploaded document reference (stored via the storage platform). */
export function documentSchema() {
  return new Schema(
    {
      type: { type: String, trim: true, default: 'other' },
      key: { type: String, required: true },
      url: { type: String, required: true },
      name: { type: String, trim: true, default: '' },
      mimeType: { type: String, default: null },
      uploadedAt: { type: Date, default: () => new Date() },
    },
    { _id: false },
  );
}
