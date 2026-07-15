import { z } from 'zod';

import { SESSION_STATUS } from '../constants/qr.constants.js';

import { objectId } from './common.validators.js';

/** Staff/admin session listing query. */
export const listSessionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(SESSION_STATUS).optional(),
  tableId: objectId.optional(),
  restaurantId: objectId.optional(),
  branchId: objectId.optional(),
});

/** Admin force-release a table (terminates live sessions). */
export const releaseTableSchema = z.object({
  tableId: objectId,
});
