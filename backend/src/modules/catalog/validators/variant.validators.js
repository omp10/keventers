import { z } from 'zod';

import { ENTITY_STATUS } from '../constants/catalog.constants.js';

const money = z.number().min(0);

export const createVariantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(60).nullable().optional(),
  price: money,
  compareAtPrice: money.nullable().optional(),
  isAvailable: z.boolean().optional(),
  preparationTimeMinutes: z.number().int().min(0).max(600).nullable().optional(),
  isDefault: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateVariantSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    sku: z.string().trim().max(60).nullable().optional(),
    price: money.optional(),
    compareAtPrice: money.nullable().optional(),
    isAvailable: z.boolean().optional(),
    preparationTimeMinutes: z.number().int().min(0).max(600).nullable().optional(),
    isDefault: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
    status: z.nativeEnum(ENTITY_STATUS).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });
