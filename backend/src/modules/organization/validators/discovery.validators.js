import { z } from 'zod';

import { BANNER_PLACEMENT, BANNER_STATUS, BANNER_THEME } from '../models/banner.model.js';
import { CATEGORY_STATUS } from '../models/category.model.js';
import { ZONE_STATUS, ZONE_TYPE } from '../models/zone.model.js';
import { BRANCH_STATUS } from '../constants/organization.constants.js';

/** Comma-separated list → trimmed string array (discovery query params). */
const csv = z
  .string()
  .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
  .optional();

export const discoveryQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).optional(),
  openNow: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  services: csv,
  cuisines: csv,
  sort: z.enum(['nearest', 'rating', 'popular', 'newest']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export const suggestQuerySchema = z.object({
  q: z.string().trim().max(120).default(''),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export const branchSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(80),
});

export const publicBannersQuerySchema = z.object({
  placement: z.enum(Object.values(BANNER_PLACEMENT)).optional(),
});

/* ── Admin banner CRUD ── */

const ctaSchema = z.object({
  label: z.string().trim().max(40).default(''),
  href: z.string().trim().max(300).default(''),
});

export const createBannerSchema = z.object({
  placement: z.enum(Object.values(BANNER_PLACEMENT)).optional(),
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(160).optional(),
  theme: z.enum(Object.values(BANNER_THEME)).optional(),
  imageUrl: z.string().url().max(500).nullish(),
  cta: ctaSchema.optional(),
  branchSlug: z.string().trim().max(80).nullish(),
  sortOrder: z.coerce.number().int().optional(),
  status: z.enum(Object.values(BANNER_STATUS)).optional(),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
});

export const updateBannerSchema = createBannerSchema.partial();

export const listBannersQuerySchema = z.object({
  placement: z.enum(Object.values(BANNER_PLACEMENT)).optional(),
  status: z.enum(Object.values(BANNER_STATUS)).optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/* ── Admin category CRUD (storefront browse tiles) ── */

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  slug: z.string().trim().max(60).optional(),
  imageUrl: z.string().url().max(500).nullish(),
  icon: z.string().trim().max(40).optional(),
  searchTerm: z.string().trim().max(60).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  status: z.enum(Object.values(CATEGORY_STATUS)).optional(),
});
export const updateCategorySchema = createCategorySchema.partial();
export const listCategoriesQuerySchema = z.object({
  status: z.enum(Object.values(CATEGORY_STATUS)).optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export const reorderSchema = z.object({ ids: z.array(z.string()).max(100) });

/* ── Admin zone CRUD (delivery/service coverage circles) ── */

const centerSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const createZoneSchema = z.object({
  name: z.string().trim().min(1).max(60),
  code: z.string().trim().max(20).optional(),
  city: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).optional(),
  type: z.enum(Object.values(ZONE_TYPE)).optional(),
  center: centerSchema,
  radiusKm: z.coerce.number().min(0.1).max(100),
  deliveryFee: z.coerce.number().min(0).optional(),
  minOrderAmount: z.coerce.number().min(0).optional(),
  etaMinutes: z.coerce.number().int().min(0).nullish(),
  sortOrder: z.coerce.number().int().optional(),
  status: z.enum(Object.values(ZONE_STATUS)).optional(),
});
export const updateZoneSchema = createZoneSchema.partial();
export const listZonesQuerySchema = z.object({
  status: z.enum(Object.values(ZONE_STATUS)).optional(),
  type: z.enum(Object.values(ZONE_TYPE)).optional(),
  city: z.string().trim().max(80).optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export const publicZonesQuerySchema = z.object({ city: z.string().trim().max(80).optional() });

/* ── Admin kitchen (outlet discovery profile) CRUD ── */

const serviceSchema = z.object({
  mode: z.enum(['dine_in', 'takeaway', 'delivery', 'drive_thru', 'curbside']),
  available: z.boolean().default(true),
  etaMinutes: z.coerce.number().int().min(0).nullish(),
});

const discoveryProfileSchema = z.object({
  coverImageUrl: z.string().url().max(500).nullish().or(z.literal('')),
  description: z.string().trim().max(600).optional(),
  area: z.string().trim().max(80).optional(),
  rating: z.coerce.number().min(0).max(5).nullish(),
  ratingCount: z.coerce.number().int().min(0).optional(),
  prepTimeMinutes: z.coerce.number().int().min(0).nullish(),
  featured: z.boolean().optional(),
  promoted: z.boolean().optional(),
  offer: z
    .object({ label: z.string().trim().max(60).default(''), description: z.string().trim().max(160).optional() })
    .nullish(),
  popularityScore: z.coerce.number().min(0).optional(),
  services: z.array(serviceSchema).max(5).optional(),
});

export const createKitchenSchema = z.object({
  restaurantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid restaurantId'),
  name: z.string().trim().min(1).max(80),
  code: z.string().trim().max(20).optional(),
  slug: z.string().trim().max(80).optional(),
  status: z.enum(Object.values(BRANCH_STATUS)).optional(),
  address: z
    .object({
      line1: z.string().trim().max(200).optional(),
      city: z.string().trim().max(80).optional(),
      state: z.string().trim().max(80).optional(),
      pincode: z.string().trim().max(12).optional(),
    })
    .optional(),
  location: centerSchema.nullish(),
  discovery: discoveryProfileSchema.optional(),
  acceptsOnlineOrders: z.boolean().optional(),
  tableCount: z.coerce.number().int().min(0).optional(),
});
export const updateKitchenSchema = createKitchenSchema.partial().omit({ restaurantId: true });
export const listKitchensQuerySchema = z.object({
  status: z.enum(Object.values(BRANCH_STATUS)).optional(),
  restaurantId: z.string().optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
