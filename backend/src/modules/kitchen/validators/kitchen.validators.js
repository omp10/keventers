import { z } from 'zod';

import {
  PRIORITY,
  SLA_SCOPE,
  STATION_TYPE,
} from '../constants/kitchen.constants.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
/** The :id in kitchen order routes is the ORDER id. */
export const orderIdParamSchema = z.object({ id: objectId });
export const stationIdParamSchema = z.object({ id: objectId });

export const listQueueQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.string().max(40).optional(),
  stationId: objectId.optional(),
  chefId: objectId.optional(),
  priority: z.nativeEnum(PRIORITY).optional(),
  restaurantId: objectId.optional(),
  branchId: objectId.optional(),
});

export const listStationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  type: z.nativeEnum(STATION_TYPE).optional(),
  isActive: z.coerce.boolean().optional(),
  restaurantId: objectId.optional(),
  branchId: objectId.optional(),
});

/** Assign (or auto-assign when chefId is omitted). */
export const assignSchema = z.object({
  chefId: objectId.optional(),
  mode: z.enum(['auto', 'manual']).optional(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().max(400).optional(),
});

export const setPrioritySchema = z.object({
  priority: z.nativeEnum(PRIORITY),
});

const routingSchema = z.object({
  productIds: z.array(objectId).max(500).optional(),
  categoryIds: z.array(objectId).max(200).optional(),
  isDefault: z.boolean().optional(),
});

export const createStationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.nativeEnum(STATION_TYPE).optional(),
  code: z.string().trim().max(20).optional(),
  description: z.string().trim().max(400).optional(),
  routing: routingSchema.optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateStationSchema = createStationSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const createSlaTargetSchema = z
  .object({
    scope: z.nativeEnum(SLA_SCOPE),
    productId: objectId.nullable().optional(),
    categoryId: objectId.nullable().optional(),
    targetSeconds: z.number().int().min(1).max(86400),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.scope !== SLA_SCOPE.PRODUCT || v.productId, { message: 'productId required for product scope' })
  .refine((v) => v.scope !== SLA_SCOPE.CATEGORY || v.categoryId, { message: 'categoryId required for category scope' });
