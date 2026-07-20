import { z } from 'zod';

import {
  ACCOUNT_STATUS,
  ADDRESS_TYPE,
  DIETARY_PREFERENCE,
  LOYALTY_TXN_TYPE,
  REWARD_STATUS,
  REWARD_TYPE,
} from '../constants/customer.constants.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
export const idParamSchema = z.object({ id: objectId });

const paginationQuery = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(64).optional(),
  search: z.string().max(120).optional(),
};

// ==================== CUSTOMER PROFILE / PREFERENCES ====================

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(20).optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .strict();

export const updatePreferencesSchema = z
  .object({
    favoriteProductIds: z.array(objectId).max(100).optional(),
    favoriteCategoryIds: z.array(objectId).max(100).optional(),
    dietary: z.array(z.nativeEnum(DIETARY_PREFERENCE)).optional(),
    allergies: z.array(z.string().trim().max(80)).max(50).optional(),
    language: z.string().trim().max(8).optional(),
    notifications: z
      .object({
        orderUpdates: z.boolean().optional(),
        promotions: z.boolean().optional(),
        loyalty: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

// ==================== ADDRESSES ====================

export const addressSchema = z
  .object({
    type: z.nativeEnum(ADDRESS_TYPE).optional(),
    label: z.string().trim().max(60).optional(),
    contactName: z.string().trim().max(120).optional(),
    contactPhone: z.string().trim().max(20).optional(),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    landmark: z.string().trim().max(120).optional(),
    city: z.string().trim().min(1).max(80),
    state: z.string().trim().max(80).optional(),
    postalCode: z.string().trim().max(16).optional(),
    country: z.string().trim().length(2).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const updateAddressSchema = addressSchema.partial();

// ==================== REDEEM ====================

export const redeemSchema = z
  .object({
    rewardId: objectId,
  })
  .strict();

export const referralTrackSchema = z
  .object({
    code: z.string().trim().min(3).max(24),
  })
  .strict();

// ==================== STAFF / ADMIN ====================

export const customerListQuerySchema = z
  .object({
    ...paginationQuery,
    restaurantId: objectId.optional(),
    accountStatus: z.nativeEnum(ACCOUNT_STATUS).optional(),
    origin: z.string().max(30).optional(),
  })
  .strict();

export const loyaltyLedgerQuerySchema = z
  .object({
    ...paginationQuery,
    restaurantId: objectId.optional(),
    type: z.nativeEnum(LOYALTY_TXN_TYPE).optional(),
    customerId: objectId.optional(),
  })
  .strict();

export const adjustPointsSchema = z
  .object({
    points: z.number().int().refine((v) => v !== 0, 'points must be non-zero'),
    reason: z.string().trim().min(1).max(240),
  })
  .strict();

const rewardValueSchema = z
  .object({
    discountBps: z.number().int().min(0).max(10000).optional(),
    discountAmount: z.number().int().min(0).optional(),
    maxDiscountAmount: z.number().int().min(0).optional(),
    minOrderAmount: z.number().int().min(0).optional(),
    freeProductId: objectId.optional(),
    cashbackAmount: z.number().int().min(0).optional(),
    currency: z.string().trim().length(3).optional(),
  })
  .strict();

export const createRewardSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    type: z.nativeEnum(REWARD_TYPE),
    pointsCost: z.number().int().min(0),
    value: rewardValueSchema.optional(),
    status: z.nativeEnum(REWARD_STATUS).optional(),
    availableFrom: z.coerce.date().optional(),
    availableUntil: z.coerce.date().optional(),
    minTier: z.string().max(20).optional(),
    redemptionValidityDays: z.number().int().min(0).optional(),
    perCustomerLimit: z.number().int().min(1).optional(),
    totalStock: z.number().int().min(0).optional(),
    imageUrl: z.string().url().max(500).optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict();

export const updateRewardSchema = createRewardSchema.partial();

export const rewardListQuerySchema = z
  .object({
    ...paginationQuery,
    restaurantId: objectId.optional(),
    status: z.nativeEnum(REWARD_STATUS).optional(),
    type: z.nativeEnum(REWARD_TYPE).optional(),
  })
  .strict();

export const statusQuerySchema = z
  .object({ restaurantId: objectId.optional(), ...paginationQuery })
  .strict();

/* ── Subscriptions ─────────────────────────────────────────────────────── */

export const subscriptionPlanSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    /** Minor units (paise). */
    price: z.number().int().min(0),
    currency: z.string().length(3).optional(),
    periodDays: z.number().int().min(1).max(365).default(30),
    itemQuota: z.number().int().min(0).default(0),
    perks: z.array(z.string().trim().max(120)).max(12).default([]),
    displayOrder: z.number().int().min(0).optional(),
  })
  .strict();

export const updateSubscriptionPlanSchema = subscriptionPlanSchema
  .partial()
  .extend({ status: z.enum(['active', 'archived']).optional() })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const subscribeSchema = z.object({ planId: objectId }).strict();

export const subscriberListQuerySchema = z
  .object({
    status: z.enum(['pending_payment', 'active', 'expired', 'cancelled']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

/* ── Feedback / NPS ────────────────────────────────────────────────────── */

export const feedbackSchema = z
  .object({
    orderId: objectId,
    npsScore: z.number().int().min(0).max(10).nullable().optional(),
    foodRating: z.number().int().min(1).max(5).nullable().optional(),
    serviceRating: z.number().int().min(1).max(5).nullable().optional(),
    storeRating: z.number().int().min(1).max(5).nullable().optional(),
    comment: z.string().trim().max(1000).optional(),
    /** Per-dish ratings — the source of truth for each product's rating. */
    itemRatings: z
      .array(
        z.object({
          productId: objectId,
          rating: z.number().int().min(1).max(5),
          comment: z.string().trim().max(300).optional(),
        }),
      )
      .max(50)
      .optional(),
  })
  .strict();
