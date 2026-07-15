import { z } from 'zod';

import { EXPORT_FORMAT, PERIOD } from '../constants/analytics.constants.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

const rangeShape = {
  restaurantId: objectId.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  period: z.nativeEnum(PERIOD).optional(),
};

export const rangeQuerySchema = z.object(rangeShape).strict();

export const adminRangeQuerySchema = z
  .object({ ...rangeShape, organizationId: objectId.optional() })
  .strict();

export const exportQuerySchema = z
  .object({
    ...rangeShape,
    report: z.enum(['sales', 'orders', 'products']),
    format: z.nativeEnum(EXPORT_FORMAT).optional(),
  })
  .strict();

export const rebuildBodySchema = z
  .object({ restaurantId: objectId.optional() })
  .strict();

export const reconcileBodySchema = z
  .object({
    restaurantId: objectId.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict();

export const runsQuerySchema = z
  .object({
    restaurantId: objectId.optional(),
    type: z.string().max(20).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();
