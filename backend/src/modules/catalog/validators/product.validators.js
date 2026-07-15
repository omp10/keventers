import { z } from 'zod';

import {
  ALLERGEN,
  AVAILABILITY_STATUS,
  DIETARY_TAG,
  IMAGE_ROLE,
  PRODUCT_STATUS,
  SPICE_LEVEL,
} from '../constants/catalog.constants.js';

import { availabilityWindowSchema, objectId } from './common.validators.js';

const money = z.number().min(0);

const pricingSchema = z.object({
  basePrice: money.optional(),
  compareAtPrice: money.nullable().optional(),
  promotionalPrice: money.nullable().optional(),
  scheduled: z
    .array(
      z.object({
        price: money,
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
      }),
    )
    .max(20)
    .optional(),
  taxIncluded: z.boolean().optional(),
});

const nutritionSchema = z.object({
  calories: money.nullable().optional(),
  servingSize: z.string().trim().max(60).optional(),
  protein: money.nullable().optional(),
  carbs: money.nullable().optional(),
  fat: money.nullable().optional(),
});

const availabilitySchema = z.object({
  status: z.nativeEnum(AVAILABILITY_STATUS).optional(),
  scheduled: z.boolean().optional(),
  windows: z.array(availabilityWindowSchema).max(20).optional(),
  availableFrom: z.coerce.date().nullable().optional(),
  unavailableReason: z.string().trim().max(200).optional(),
});

const imageInputSchema = z.object({
  role: z.nativeEnum(IMAGE_ROLE).optional(),
  key: z.string().max(300).nullable().optional(),
  url: z.string().url().max(500),
  alt: z.string().trim().max(200).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const createProductSchema = z.object({
  categoryId: objectId,
  menuIds: z.array(objectId).max(50).optional(),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(4000).optional(),
  shortDescription: z.string().trim().max(300).optional(),
  sku: z.string().trim().max(60).nullable().optional(),
  images: z.array(imageInputSchema).max(20).optional(),
  thumbnailUrl: z.string().url().max(500).nullable().optional(),
  heroImageUrl: z.string().url().max(500).nullable().optional(),
  pricing: pricingSchema.optional(),
  basePrice: money.optional(), // convenience shortcut for pricing.basePrice
  taxCategory: z.string().trim().max(40).optional(),
  preparationTimeMinutes: z.number().int().min(0).max(600).optional(),
  dietaryTags: z.array(z.nativeEnum(DIETARY_TAG)).max(12).optional(),
  allergens: z.array(z.nativeEnum(ALLERGEN)).max(15).optional(),
  spiceLevel: z.nativeEnum(SPICE_LEVEL).optional(),
  nutrition: nutritionSchema.optional(),
  tags: z.array(z.string().trim().max(40)).max(30).optional(),
  modifierGroupIds: z.array(objectId).max(50).optional(),
  addonIds: z.array(objectId).max(50).optional(),
  availability: availabilitySchema.optional(),
  status: z.nativeEnum(PRODUCT_STATUS).optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  trackInventory: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const setAvailabilitySchema = availabilitySchema.refine(
  (v) => Object.keys(v).length > 0,
  { message: 'No availability fields provided' },
);

export const branchOverrideSchema = z.object({
  branchId: objectId,
  variantId: objectId.nullable().optional(),
  status: z.nativeEnum(AVAILABILITY_STATUS).optional(),
  isAvailable: z.boolean().optional(),
  windows: z.array(availabilityWindowSchema).max(20).optional(),
  overrideFrom: z.coerce.date().nullable().optional(),
  overrideUntil: z.coerce.date().nullable().optional(),
  reason: z.string().trim().max(200).optional(),
});

export const removeImageSchema = z.object({ imageKey: z.string().min(1).max(300) });

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(PRODUCT_STATUS).optional(),
  categoryId: objectId.optional(),
  rootCategoryId: objectId.optional(),
  menuId: objectId.optional(),
  isFeatured: z.coerce.boolean().optional(),
  isPopular: z.coerce.boolean().optional(),
  spiceLevel: z.nativeEnum(SPICE_LEVEL).optional(),
  dietaryTag: z.nativeEnum(DIETARY_TAG).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  restaurantId: objectId.optional(),
});
