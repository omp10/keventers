import { z } from 'zod';

import {
  MENU_STATUS,
  MENU_TYPE,
  MENU_VISIBILITY,
} from '../constants/catalog.constants.js';

import { availabilityWindowSchema } from './common.validators.js';

const scheduleSchema = z.object({
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  windows: z.array(availabilityWindowSchema).max(20).optional(),
});

export const createMenuSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(1000).optional(),
  type: z.nativeEnum(MENU_TYPE).optional(),
  status: z.nativeEnum(MENU_STATUS).optional(),
  visibility: z.nativeEnum(MENU_VISIBILITY).optional(),
  schedule: scheduleSchema.optional(),
  imageUrl: z.string().url().max(500).optional(),
  imageKey: z.string().max(300).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

export const updateMenuSchema = createMenuSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const listMenusQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(MENU_STATUS).optional(),
  type: z.nativeEnum(MENU_TYPE).optional(),
  visibility: z.nativeEnum(MENU_VISIBILITY).optional(),
  restaurantId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});
