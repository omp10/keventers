import mongoose from 'mongoose';

import { APPLICATION_STATUS, RESTAURANT_TYPE } from '../constants/organization.constants.js';
import { addressSchema, baseSchemaOptions, documentSchema, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Public restaurant-registration submission. Reviewed by a Platform Super Admin
 * and, on approval, provisions an Organization + Restaurant + Branch. It is NOT
 * a tenant-scoped entity (it exists before an organization does).
 */
const onboardingApplicationSchema = new Schema(
  {
    // Business identity
    restaurantName: { type: String, required: true, trim: true },
    brandName: { type: String, trim: true, default: '' },
    ownerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },

    // Compliance
    gstNumber: { type: String, trim: true, default: '' },
    fssaiLicense: { type: String, trim: true, default: '' },
    businessRegistration: { type: String, trim: true, default: '' },

    // Location
    address: { type: addressSchema(), default: () => ({}) },

    // Profile
    restaurantType: { type: String, enum: Object.values(RESTAURANT_TYPE), default: RESTAURANT_TYPE.QSR },
    cuisines: { type: [String], default: [] },
    numberOfBranches: { type: Number, default: 1, min: 1 },

    // Assets
    logo: {
      key: { type: String, default: null },
      url: { type: String, default: null },
    },
    documents: { type: [documentSchema()], default: [] },

    // Review workflow
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.PENDING,
      index: true,
    },
    reviewNotes: { type: String, trim: true, default: '' },
    rejectionReason: { type: String, trim: true, default: '' },
    requestedInformation: { type: [String], default: [] },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: () => new Date() },

    // Set once provisioned.
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

onboardingApplicationSchema.index({ email: 1 });
onboardingApplicationSchema.index({ status: 1, createdAt: -1 });
onboardingApplicationSchema.index({ deletedAt: 1 });

export const OnboardingApplication =
  mongoose.models.OnboardingApplication ||
  mongoose.model('OnboardingApplication', onboardingApplicationSchema);

export default OnboardingApplication;
