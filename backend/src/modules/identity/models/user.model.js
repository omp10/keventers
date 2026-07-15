import mongoose from 'mongoose';

import { USER_STATUS, USER_TYPE, GENDER } from '../constants/identity.constants.js';
import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/** Embedded profile sub-document. */
const profileSchema = new Schema(
  {
    avatarUrl: { type: String, trim: true, default: null },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: Object.values(GENDER), default: GENDER.UNSPECIFIED },
    bio: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false },
);

/**
 * User: the core identity record for customers and staff. Roles and direct
 * permissions are stored as NAMES (denormalized) for fast authorization.
 * `passwordHash` is never selected by default (`select: false`).
 */
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, trim: true, default: null },
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true, default: '' },

    roles: { type: [String], default: [] },
    permissions: { type: [String], default: [] },

    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(USER_TYPE),
      default: USER_TYPE.CUSTOMER,
      index: true,
    },

    emailVerified: { type: Boolean, default: false },
    profile: { type: profileSchema, default: () => ({}) },

    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

// Full name virtual.
userSchema.virtual('fullName').get(function fullName() {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

// Indexes (including compound).
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ status: 1, type: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ deletedAt: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
