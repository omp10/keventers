import { z } from 'zod';

import { ENTITY_STATUS } from '../constants/catalog.constants.js';

const money = z.number().min(0);

export const createAddonSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  price: money.optional(),
  calories: money.nullable().optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  imageKey: z.string().max(300).nullable().optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateAddonSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    price: money.optional(),
    calories: money.nullable().optional(),
    imageUrl: z.string().url().max(500).nullable().optional(),
    imageKey: z.string().max(300).nullable().optional(),
    isAvailable: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
    status: z.nativeEnum(ENTITY_STATUS).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const listAddonsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(ENTITY_STATUS).optional(),
  restaurantId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});
