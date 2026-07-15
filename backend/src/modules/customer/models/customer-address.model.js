import mongoose from 'mongoose';

import { ADDRESS_TYPE } from '../constants/customer.constants.js';
import { baseSchemaOptions, softDeleteField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Customer address — a separate collection (a customer has many; future delivery
 * needs geo + rich querying). Restaurant-scoped like its owner. `geo` is a
 * GeoJSON Point, future-ready for delivery-radius lookups (2dsphere index).
 */
const addressSchema = new Schema(
  {
    ...tenantFields,
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },

    type: { type: String, enum: Object.values(ADDRESS_TYPE), default: ADDRESS_TYPE.HOME },
    label: { type: String, default: null, trim: true, maxlength: 60 },
    contactName: { type: String, default: null, trim: true, maxlength: 120 },
    contactPhone: { type: String, default: null, trim: true, maxlength: 20 },

    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, default: null, trim: true, maxlength: 200 },
    landmark: { type: String, default: null, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, default: null, trim: true, maxlength: 80 },
    postalCode: { type: String, default: null, trim: true, maxlength: 16 },
    country: { type: String, default: 'IN', trim: true, maxlength: 2 },

    geo: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },

    isDefault: { type: Boolean, default: false },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

addressSchema.index({ customerId: 1, deletedAt: 1 });
addressSchema.index({ geo: '2dsphere' }, { sparse: true });

export const CustomerAddress =
  mongoose.models.CustomerAddress || mongoose.model('CustomerAddress', addressSchema);

export default CustomerAddress;
