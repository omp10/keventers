import { z } from 'zod';

import {
  ENTITY_STATUS,
  MODIFIER_GROUP_TYPE,
} from '../constants/catalog.constants.js';

const money = z.number().min(0);

export const createModifierGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  type: z.nativeEnum(MODIFIER_GROUP_TYPE).optional(),
  isRequired: z.boolean().optional(),
  minSelection: z.number().int().min(0).max(100).optional(),
  maxSelection: z.number().int().min(0).max(100).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateModifierGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    type: z.nativeEnum(MODIFIER_GROUP_TYPE).optional(),
    isRequired: z.boolean().optional(),
    minSelection: z.number().int().min(0).max(100).optional(),
    maxSelection: z.number().int().min(0).max(100).nullable().optional(),
    displayOrder: z.number().int().min(0).optional(),
    status: z.nativeEnum(ENTITY_STATUS).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const createModifierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: money.optional(),
  calories: money.nullable().optional(),
  isDefault: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateModifierSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    price: money.optional(),
    calories: money.nullable().optional(),
    isDefault: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
    status: z.nativeEnum(ENTITY_STATUS).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const listGroupsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(ENTITY_STATUS).optional(),
  restaurantId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});
