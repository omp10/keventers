import { z } from 'zod';

import {
  ALL_CATEGORIES,
  CAMPAIGN_STATUS,
  CATEGORY,
  CHANNEL,
  NOTIFICATION_STATUS,
} from '../constants/notification.constants.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
export const idParamSchema = z.object({ id: objectId });

const pagination = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(64).optional(),
  search: z.string().max(120).optional(),
};

// ---- customer ----
export const inboxQuerySchema = z
  .object({ ...pagination, status: z.nativeEnum(NOTIFICATION_STATUS).optional() })
  .strict();

const channelToggle = z
  .object({
    inapp: z.boolean().optional(),
    push: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
  })
  .strict();

const categoriesShape = {};
for (const c of ALL_CATEGORIES) categoriesShape[c] = channelToggle.optional();

export const updatePreferencesSchema = z
  .object({
    categories: z.object(categoriesShape).strict().optional(),
    email: z.string().email().max(160).optional(),
    phone: z.string().max(20).optional(),
    deviceTokens: z.array(z.string().max(300)).max(20).optional(),
    mutedUntil: z.coerce.date().nullable().optional(),
  })
  .strict();

// ---- restaurant / admin ----
export const notificationListQuerySchema = z
  .object({
    ...pagination,
    restaurantId: objectId.optional(),
    status: z.nativeEnum(NOTIFICATION_STATUS).optional(),
    category: z.nativeEnum(CATEGORY).optional(),
    channel: z.nativeEnum(CHANNEL).optional(),
    audience: z.string().max(20).optional(),
  })
  .strict();

export const testSendSchema = z
  .object({
    restaurantId: objectId.optional(),
    channel: z.nativeEnum(CHANNEL),
    templateKey: z.string().min(1).max(60),
    to: z.string().max(320).optional(),
    variables: z.record(z.any()).optional(),
  })
  .strict();

export const createTemplateSchema = z
  .object({
    restaurantId: objectId.optional(),
    key: z.string().min(1).max(60),
    channel: z.nativeEnum(CHANNEL),
    locale: z.string().max(8).optional(),
    category: z.nativeEnum(CATEGORY),
    subject: z.string().max(200).optional(),
    body: z.string().min(1).max(4000),
    variables: z.array(z.string().max(60)).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateTemplateSchema = z
  .object({
    subject: z.string().max(200).optional(),
    body: z.string().min(1).max(4000).optional(),
    category: z.nativeEnum(CATEGORY).optional(),
    locale: z.string().max(8).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const templateListQuerySchema = z
  .object({ ...pagination, restaurantId: objectId.optional(), key: z.string().max(60).optional(), channel: z.nativeEnum(CHANNEL).optional() })
  .strict();

export const createCampaignSchema = z
  .object({
    restaurantId: objectId.optional(),
    name: z.string().min(1).max(140),
    description: z.string().max(500).optional(),
    category: z.nativeEnum(CATEGORY).optional(),
    channels: z.array(z.nativeEnum(CHANNEL)).min(1),
    templateKey: z.string().min(1).max(60),
    segment: z
      .object({
        tiers: z.array(z.string()).optional(),
        minLifetimeSpend: z.number().int().min(0).optional(),
        inactiveDays: z.number().int().min(0).optional(),
        tags: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
    variables: z.record(z.any()).optional(),
    scheduledAt: z.coerce.date().optional(),
  })
  .strict();

export const updateCampaignSchema = createCampaignSchema.partial();

export const campaignListQuerySchema = z
  .object({ ...pagination, restaurantId: objectId.optional(), status: z.nativeEnum(CAMPAIGN_STATUS).optional() })
  .strict();

export const outboxListQuerySchema = z
  .object({ ...pagination, restaurantId: objectId.optional(), status: z.string().max(20).optional(), eventName: z.string().max(60).optional() })
  .strict();

/** Register/unregister an FCM device token. */
export const deviceTokenSchema = z.object({ token: z.string().min(20).max(4096) }).strict();

/**
 * FCM registration from any of our apps. `platform` is free-form on purpose —
 * clients report "web" / "android" / "ios" and we normalise onto the two
 * surfaces we store, rather than 400ing a device that spells itself differently.
 */
export const fcmTokenSchema = z
  .object({
    token: z.string().trim().min(20).max(4096),
    platform: z.string().trim().max(20).optional(),
  })
  .strict();

/** Optional overrides for the self-test push. */
export const testPushSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  body: z.string().trim().min(1).max(400).optional(),
}).strict();

/** Admin broadcast: one message to a restaurant's customers/staff/everyone. */
export const broadcastSchema = z
  .object({
    restaurantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format'),
    audience: z.enum(['customers', 'staff', 'everyone']).default('customers'),
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().min(2).max(500),
  })
  .strict();
