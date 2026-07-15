import { z } from 'zod';

import {
  NOTE_TYPE,
  NOTE_VISIBILITY,
  ORDER_STATUS,
} from '../constants/order.constants.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
export const idParamSchema = z.object({ id: objectId });

/** Checkout takes NO body fields that influence price (server-side only). */
export const checkoutSchema = z.object({}).optional();

export const cancelSchema = z.object({
  reason: z.string().trim().max(400).optional(),
});

/** Staff generic status change — only forward-of-placed staff targets allowed. */
export const updateStatusSchema = z.object({
  status: z.enum([
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY,
    ORDER_STATUS.SERVED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
  ]),
  reason: z.string().trim().max(400).optional(),
});

export const addNoteSchema = z.object({
  type: z.nativeEnum(NOTE_TYPE),
  body: z.string().trim().min(1).max(1000),
  visibility: z.nativeEnum(NOTE_VISIBILITY).optional(),
});

export const refundRequestSchema = z.object({
  reason: z.string().trim().max(400).optional(),
});

export const rejectRefundSchema = z.object({
  reason: z.string().trim().max(400).optional(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(ORDER_STATUS).optional(),
  orderType: z.string().max(40).optional(),
  customerUserId: objectId.optional(),
  restaurantId: objectId.optional(),
  branchId: objectId.optional(),
});
