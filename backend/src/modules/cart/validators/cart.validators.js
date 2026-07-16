import { z } from 'zod';

import { CART_ITEM_LIMITS } from '../constants/cart.constants.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
export const itemIdParamSchema = z.object({ id: objectId });

/** Optimistic-concurrency version (clients echo the version they last read). */
const version = z.coerce.number().int().min(0).optional();

/**
 * Add an item. NOTE: clients NEVER send prices — only catalog ids + selections +
 * quantity. All money is resolved and computed server-side.
 */
export const addItemSchema = z.object({
  productId: objectId,
  variantId: objectId.nullable().optional(),
  modifierIds: z.array(objectId).max(50).optional(),
  addonIds: z.array(objectId).max(50).optional(),
  quantity: z.number().int().min(1).max(CART_ITEM_LIMITS.MAX_QUANTITY),
  specialInstructions: z.string().trim().max(CART_ITEM_LIMITS.MAX_SPECIAL_INSTRUCTIONS).optional(),
  notes: z.string().trim().max(CART_ITEM_LIMITS.MAX_NOTES).optional(),
  version,
});

export const updateItemSchema = z
  .object({
    quantity: z.number().int().min(1).max(CART_ITEM_LIMITS.MAX_QUANTITY).optional(),
    specialInstructions: z.string().trim().max(CART_ITEM_LIMITS.MAX_SPECIAL_INSTRUCTIONS).optional(),
    notes: z.string().trim().max(CART_ITEM_LIMITS.MAX_NOTES).optional(),
    version,
  })
  .refine((v) => v.quantity !== undefined || v.specialInstructions !== undefined || v.notes !== undefined, {
    message: 'No updatable fields provided',
  });

export const applyCouponSchema = z.object({
  code: z.string().trim().min(3).max(40),
  version,
});

export const updateCartSchema = z.object({
  notes: z.string().trim().max(CART_ITEM_LIMITS.MAX_NOTES),
  version,
});

export const createCartSchema = z.object({}).optional();
