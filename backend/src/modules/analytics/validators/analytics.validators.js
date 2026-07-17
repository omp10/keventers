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

/**
 * Admin range + progressive scope. A super admin has no primary tenant, so the
 * scope is explicit: organization, restaurant, or a single branch (the kitchen
 * detail page passes `branchId` to read one outlet's projections).
 */
export const adminRangeQuerySchema = z
  .object({
    ...rangeShape,
    organizationId: objectId.optional(),
    restaurantId: objectId.optional(),
    branchId: objectId.optional(),
  })
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

/** Customer-journey sink: a small batch of vocabulary events from one visit. */
export const journeyIngestSchema = z
  .object({
    events: z
      .array(
        z.object({
          journeyId: z.string().min(8).max(64),
          event: z.string().min(1).max(60),
          at: z.coerce.date().optional(),
          properties: z.record(z.unknown()).optional(),
        }),
      )
      .min(1)
      .max(50),
  })
  .strict();

export const journeyListQuerySchema = z
  .object({
    branchId: objectId.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
