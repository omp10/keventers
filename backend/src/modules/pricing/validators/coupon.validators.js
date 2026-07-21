import { z } from 'zod';

import {
  COUPON_AUDIENCE,
  COUPON_STATUS,
  COUPON_TYPE,
} from '../constants/pricing.constants.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
export const idParamSchema = z.object({ id: objectId });

const minorInt = z.number().int().min(0); // minor units OR basis points

export const createCouponSchema = z
  .object({
    code: z.string().trim().min(3).max(40),
    description: z.string().trim().max(300).optional(),
    type: z.nativeEnum(COUPON_TYPE),
    /** bps for percentage, minor units for fixed. */
    value: minorInt.optional(),
    currency: z.string().length(3).optional(),
    minSubtotal: minorInt.nullable().optional(),
    maxDiscount: minorInt.nullable().optional(),
    targetProductId: objectId.nullable().optional(),
    buyQuantity: z.number().int().min(1).nullable().optional(),
    getQuantity: z.number().int().min(1).nullable().optional(),
    status: z.nativeEnum(COUPON_STATUS).optional(),
    validFrom: z.coerce.date().nullable().optional(),
    validUntil: z.coerce.date().nullable().optional(),
    usageLimit: z.number().int().min(0).nullable().optional(),
    audience: z.nativeEnum(COUPON_AUDIENCE).optional(),
    perCustomerLimit: z.number().int().min(1).nullable().optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((v) => v.type !== COUPON_TYPE.PERCENTAGE || (v.value ?? 0) > 0, {
    message: 'Percentage coupons require a value (basis points)',
  })
  .refine((v) => v.type !== COUPON_TYPE.FIXED || (v.value ?? 0) > 0, {
    message: 'Fixed coupons require a value (minor units)',
  })
  .refine((v) => v.type !== COUPON_TYPE.BUY_X_GET_Y || (v.buyQuantity && v.getQuantity), {
    message: 'Buy-X-Get-Y coupons require buyQuantity and getQuantity',
  });

export const updateCouponSchema = z
  .object({
    description: z.string().trim().max(300).optional(),
    type: z.nativeEnum(COUPON_TYPE).optional(),
    value: minorInt.optional(),
    currency: z.string().length(3).optional(),
    minSubtotal: minorInt.nullable().optional(),
    maxDiscount: minorInt.nullable().optional(),
    targetProductId: objectId.nullable().optional(),
    buyQuantity: z.number().int().min(1).nullable().optional(),
    getQuantity: z.number().int().min(1).nullable().optional(),
    status: z.nativeEnum(COUPON_STATUS).optional(),
    validFrom: z.coerce.date().nullable().optional(),
    validUntil: z.coerce.date().nullable().optional(),
    usageLimit: z.number().int().min(0).nullable().optional(),
    audience: z.nativeEnum(COUPON_AUDIENCE).optional(),
    perCustomerLimit: z.number().int().min(1).nullable().optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const listCouponsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(COUPON_STATUS).optional(),
  restaurantId: objectId.optional(),
});
