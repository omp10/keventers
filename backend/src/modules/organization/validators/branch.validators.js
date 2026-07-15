import { z } from 'zod';

import { BRANCH_STATUS, DAYS_OF_WEEK } from '../constants/organization.constants.js';

import { addressSchema, objectId } from './common.validators.js';

const businessHour = z.object({
  day: z.enum(DAYS_OF_WEEK),
  isOpen: z.boolean().optional(),
  open: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Use HH:mm')
    .optional(),
  close: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Use HH:mm')
    .optional(),
});

export const createBranchSchema = z.object({
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().max(40).optional(),
  restaurantId: objectId.optional(),
  address: addressSchema.optional(),
  businessHours: z.array(businessHour).max(7).optional(),
  managerUserId: objectId.optional(),
  settings: z
    .object({
      currency: z.string().max(8).optional(),
      timezone: z.string().max(60).optional(),
      acceptsOnlineOrders: z.boolean().optional(),
      tableCount: z.number().int().min(0).optional(),
    })
    .optional(),
});

export const updateBranchSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    code: z.string().trim().max(40).optional(),
    address: addressSchema.optional(),
    managerUserId: objectId.optional(),
    status: z.nativeEnum(BRANCH_STATUS).optional(),
    settings: z
      .object({
        currency: z.string().max(8).optional(),
        timezone: z.string().max(60).optional(),
        acceptsOnlineOrders: z.boolean().optional(),
        tableCount: z.number().int().min(0).optional(),
      })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const updateBusinessHoursSchema = z.object({
  businessHours: z.array(businessHour).min(1).max(7),
});
