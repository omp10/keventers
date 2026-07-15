import mongoose from 'mongoose';

import { BRANCH_STATUS } from '../constants/organization.constants.js';
import {
  addressSchema,
  baseSchemaOptions,
  businessHoursSchema,
  softDeleteField,
} from '../utils/schema.util.js';

const { Schema } = mongoose;

const branchSettingsSchema = new Schema(
  {
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    acceptsOnlineOrders: { type: Boolean, default: true },
    tableCount: { type: Number, default: 0 },
  },
  { _id: false },
);

/**
 * Branch: one operational outlet of a restaurant. Tenant-scoped
 * (organizationId + restaurantId) with independent address, business hours,
 * settings and manager.
 */
const branchSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    address: { type: addressSchema(), default: () => ({}) },
    businessHours: { type: [businessHoursSchema()], default: [] },
    settings: { type: branchSettingsSchema, default: () => ({}) },
    managerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isPrimary: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(BRANCH_STATUS),
      default: BRANCH_STATUS.ACTIVE,
      index: true,
    },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

branchSchema.index({ restaurantId: 1, status: 1 });
branchSchema.index({ organizationId: 1, restaurantId: 1 });
branchSchema.index({ restaurantId: 1, code: 1 }, { unique: true, sparse: true });
branchSchema.index({ deletedAt: 1 });

export const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema);

export default Branch;
