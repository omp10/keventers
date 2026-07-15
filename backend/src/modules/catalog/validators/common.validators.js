import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
export const idParamSchema = z.object({ id: objectId });
export const productIdParamSchema = z.object({ productId: objectId });
export const groupModifierParamSchema = z.object({ id: objectId, modifierId: objectId });

/** Base list/query shape shared by every catalog listing endpoint. Supports
 * pagination, sorting, free-text search and an optional restaurantId (used by
 * org-admin / super-admin callers to target a restaurant they own). */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.string().max(40).optional(),
  restaurantId: objectId.optional(),
});

/** Availability time window (reused by product + branch override validators). */
export const availabilityWindowSchema = z.object({
  label: z.string().trim().max(60).optional(),
  days: z
    .array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
    .max(7)
    .optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm')
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm')
    .optional(),
});
