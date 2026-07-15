import { z } from 'zod';

import { CATEGORY_STATUS } from '../constants/catalog.constants.js';

import { objectId } from './common.validators.js';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(1000).optional(),
  menuId: objectId.optional(),
  /** null / omitted → main category; a category id → subcategory (depth 2 max). */
  parentId: objectId.nullable().optional(),
  imageUrl: z.string().url().max(500).optional(),
  imageKey: z.string().max(300).optional(),
  iconUrl: z.string().url().max(500).optional(),
  status: z.nativeEnum(CATEGORY_STATUS).optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(CATEGORY_STATUS).optional(),
  menuId: objectId.optional(),
  /** 'main'/'null' → main categories; an id → that parent's subcategories. */
  parentId: z.string().max(40).optional(),
  restaurantId: objectId.optional(),
});
