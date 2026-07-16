import { z } from 'zod';

import { APPLICATION_STATUS, RESTAURANT_TYPE } from '../constants/organization.constants.js';

/** Split CSV strings into arrays; pass arrays through (multipart-friendly). */
const csvToArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return undefined;
};

/** Public restaurant-registration form (multipart text fields; files handled separately). */
export const registerRestaurantSchema = z.object({
  restaurantName: z.string().trim().min(1).max(160),
  brandName: z.string().trim().max(160).optional(),
  ownerName: z.string().trim().min(1).max(120),
  email: z.string().email().toLowerCase(),
  phone: z.string().trim().min(7).max(20),
  gstNumber: z.string().trim().max(40).optional(),
  fssaiLicense: z.string().trim().max(60).optional(),
  businessRegistration: z.string().trim().max(80).optional(),
  line1: z.string().trim().max(200).optional(),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  country: z.string().trim().max(80).optional(),
  pincode: z.string().trim().min(3).max(12),
  restaurantType: z.nativeEnum(RESTAURANT_TYPE).optional(),
  cuisines: z.preprocess(csvToArray, z.array(z.string().trim()).max(30).optional()),
  numberOfBranches: z.coerce.number().int().min(1).max(500).optional(),
});

export const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(APPLICATION_STATUS).optional(),
});

export const approveApplicationSchema = z.object({
  organizationName: z.string().trim().max(160).optional(),
  restaurantName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const rejectApplicationSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export const requestInformationSchema = z.object({
  requestedInformation: z.array(z.string().trim().min(1)).min(1),
  message: z.string().trim().max(1000).optional(),
});

const onboardingFieldSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-zA-Z0-9_]*$/).max(80),
  label: z.string().trim().min(1).max(120),
  phase: z.enum(['application', 'setup']),
  type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'file']),
  required: z.boolean(),
  enabled: z.boolean(),
  helpText: z.string().trim().max(300).optional().default(''),
  placeholder: z.string().trim().max(160).optional().default(''),
  options: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([]),
  acceptedFileTypes: z.array(z.string().trim().min(1).max(100)).max(20).optional().default([]),
  maxFileSizeMb: z.coerce.number().int().min(1).max(25).optional().default(5),
  multiple: z.boolean().optional().default(false),
  order: z.number().int().min(0).optional(),
});

export const updateOnboardingFormConfigSchema = z.object({
  fields: z.array(onboardingFieldSchema).max(100).refine(
    (fields) => new Set(fields.map((field) => field.key)).size === fields.length,
    { message: 'Onboarding field keys must be unique' },
  ),
});
