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
    },
    phone: { type: String, trim: true, default: null },

    /**
     * FCM registration tokens, one per surface. A person can be signed in on the
     * phone AND a desk browser at once (a chef on the kitchen screen, a manager
     * on their laptop), so one field would silently drop one of them. Identity is
     * global here, so these live on the user and serve the customer, staff and
     * kitchen apps alike.
     */
    fcmTokenWeb: { type: String, trim: true, default: '' },
    fcmTokenMobile: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    /**
     * Not required: a phone-first signup has no name until onboarding asks for
     * one, and the honest representation of "we haven't asked yet" is empty — not
     * a placeholder like "New User", which reads as a real name forever. Paths
     * that DO know the name (register, staff invite) still enforce it at their
     * API validators, which is where that rule belongs.
     */
    firstName: { type: String, trim: true, default: '' },
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
//
// PARTIAL, not sparse: `phone` defaults to null, so the field is PRESENT on
// every phone-less user — and sparse only skips MISSING fields. The unique
// constraint therefore applied to null itself, so exactly one account could
// exist without a phone and the next staff invite (which sets no phone) died on
// a raw E11000. Only real string phones take part. Same lesson as Branch.slug.
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ status: 1, type: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ deletedAt: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
