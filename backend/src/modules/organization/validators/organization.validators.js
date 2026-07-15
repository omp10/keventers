import { z } from 'zod';

import { ORGANIZATION_STATUS, SUBSCRIPTION_PLAN } from '../constants/organization.constants.js';

import { objectId } from './common.validators.js';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  brandName: z.string().trim().max(160).optional(),
  ownerUserId: objectId,
  contact: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().trim().max(20).optional(),
    })
    .optional(),
});

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    brandName: z.string().trim().max(160).optional(),
    contact: z
      .object({
        email: z.string().email().optional(),
        phone: z.string().trim().max(20).optional(),
      })
      .optional(),
    settings: z
      .object({
        defaultCurrency: z.string().max(8).optional(),
        defaultTimezone: z.string().max(60).optional(),
        locale: z.string().max(10).optional(),
      })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const suspendOrganizationSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const listOrganizationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(ORGANIZATION_STATUS).optional(),
});

export const updateSubscriptionSchema = z.object({
  plan: z.nativeEnum(SUBSCRIPTION_PLAN).optional(),
  action: z.enum(['activate', 'suspend', 'expire', 'cancel', 'start_trial']).optional(),
});
