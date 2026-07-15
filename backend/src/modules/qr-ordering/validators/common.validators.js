import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
export const idParamSchema = z.object({ id: objectId });
export const tableIdParamSchema = z.object({ tableId: objectId });
export const sessionIdParamSchema = z.object({ sessionId: z.string().min(8).max(80) });

/** Base list/query shape shared by the management listing endpoints. `restaurantId`
 * and `branchId` let org-admins target a restaurant/branch they own. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.string().max(40).optional(),
  restaurantId: objectId.optional(),
  branchId: objectId.optional(),
});

/** Device fingerprint accepted from the public scan/recover/session endpoints. */
export const deviceSchema = z.object({
  deviceId: z.string().max(120).optional(),
  userAgent: z.string().max(400).optional(),
});
