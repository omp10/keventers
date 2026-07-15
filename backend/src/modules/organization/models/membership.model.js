import mongoose from 'mongoose';

import { MEMBERSHIP_SCOPE, MEMBERSHIP_STATUS } from '../constants/organization.constants.js';
import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Membership: the multi-tenancy binding between an identity User and an
 * Organization (optionally narrowed to a restaurant/branch) with a role. This
 * is how tenancy is resolved WITHOUT modifying the identity User model. The
 * tenant middleware reads these to scope every request.
 */
const membershipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    scope: {
      type: String,
      enum: Object.values(MEMBERSHIP_SCOPE),
      default: MEMBERSHIP_SCOPE.ORGANIZATION,
    },
    role: { type: String, required: true },
    isOwner: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(MEMBERSHIP_STATUS),
      default: MEMBERSHIP_STATUS.ACTIVE,
      index: true,
    },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

// A user has at most one membership per (org, restaurant, branch) tuple.
membershipSchema.index(
  { userId: 1, organizationId: 1, restaurantId: 1, branchId: 1 },
  { unique: true },
);
membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ organizationId: 1, role: 1 });
membershipSchema.index({ deletedAt: 1 });

export const Membership =
  mongoose.models.Membership || mongoose.model('Membership', membershipSchema);

export default Membership;
