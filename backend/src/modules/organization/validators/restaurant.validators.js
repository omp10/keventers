import { z } from 'zod';

import { ONBOARDING_STEPS, RESTAURANT_TYPE } from '../constants/organization.constants.js';

import { addressSchema } from './common.validators.js';

export const updateRestaurantProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    type: z.nativeEnum(RESTAURANT_TYPE).optional(),
    cuisines: z.array(z.string().trim()).max(30).optional(),
    address: addressSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

const taxRate = z.object({ name: z.string().trim(), percentage: z.number().min(0).max(100) });

/** Partial settings — merged onto the existing settings by the service. */
export const updateRestaurantSettingsSchema = z
  .object({
    branding: z
      .object({
        logoUrl: z.string().url().optional(),
        coverImageUrl: z.string().url().optional(),
      })
      .optional(),
    theme: z
      .object({
        primaryColor: z.string().max(20).optional(),
        secondaryColor: z.string().max(20).optional(),
      })
      .optional(),
    currency: z.string().max(8).optional(),
    timezone: z.string().max(60).optional(),
    tax: z
      .object({
        enabled: z.boolean().optional(),
        inclusive: z.boolean().optional(),
        rates: z.array(taxRate).optional(),
      })
      .optional(),
    contact: z
      .object({
        email: z.string().email().optional(),
        phone: z.string().max(20).optional(),
        website: z.string().max(200).optional(),
      })
      .optional(),
    social: z
      .object({
        instagram: z.string().max(200).optional(),
        facebook: z.string().max(200).optional(),
        twitter: z.string().max(200).optional(),
      })
      .optional(),
    delivery: z
      .object({ enabled: z.boolean().optional(), radiusKm: z.number().min(0).max(100).optional() })
      .optional(),
    orderPreferences: z
      .object({
        dineIn: z.boolean().optional(),
        takeaway: z.boolean().optional(),
        delivery: z.boolean().optional(),
        minOrderAmount: z.number().min(0).optional(),
      })
      .optional(),
    qr: z
      .object({
        enabled: z.boolean().optional(),
        requireTableSelection: z.boolean().optional(),
        logoOnQr: z.boolean().optional(),
      })
      .optional(),
    notifications: z
      .object({
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
      })
      .optional(),
    payment: z
      .object({ gateway: z.string().max(40).nullable().optional(), codEnabled: z.boolean().optional() })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No settings provided' });

/** First-login wizard: submit one step at a time. */
export const onboardingStepSchema = z.object({
  step: z.enum(ONBOARDING_STEPS),
  data: z.record(z.any()).optional(),
});
