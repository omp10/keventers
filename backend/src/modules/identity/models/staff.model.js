import mongoose from 'mongoose';

import { STAFF_STATUS } from '../constants/identity.constants.js';
import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Staff: staff-specific extension of a User (1:1). Holds employment attributes.
 * `userId` references the owning User; `reportsTo` models the reporting line.
 */
const staffSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    employeeId: { type: String, required: true, unique: true, trim: true },
    designation: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    reportsTo: { type: Schema.Types.ObjectId, ref: 'Staff', default: null },
    joinedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(STAFF_STATUS),
      default: STAFF_STATUS.ACTIVE,
    },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

staffSchema.index({ department: 1, status: 1 });
staffSchema.index({ deletedAt: 1 });

export const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);

export default Staff;
