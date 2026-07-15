import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { AdminAnalyticsController } from '../controllers/admin-analytics.controller.js';
import { adminRangeQuerySchema } from '../validators/analytics.validators.js';

import { adminGuards } from './_guards.js';

const router = Router();
router.use(...adminGuards);

/**
 * @openapi
 * /api/v1/admin/analytics/platform:
 *   get: { tags: [Analytics - Admin], security: [{ bearerAuth: [] }], summary: Platform KPIs (revenue, orders, customers, provider mix, notification health), responses: { 200: { description: Platform } } }
 * /api/v1/admin/analytics/restaurants:
 *   get: { tags: [Analytics - Admin], security: [{ bearerAuth: [] }], summary: Restaurant revenue leaderboard, responses: { 200: { description: Restaurants } } }
 * /api/v1/admin/analytics/revenue:
 *   get: { tags: [Analytics - Admin], security: [{ bearerAuth: [] }], summary: Platform revenue, responses: { 200: { description: Revenue } } }
 * /api/v1/admin/analytics/providers:
 *   get: { tags: [Analytics - Admin], security: [{ bearerAuth: [] }], summary: Payment-provider + notification-channel distribution, responses: { 200: { description: Providers } } }
 */
router.get('/platform', validate({ query: adminRangeQuerySchema }), AdminAnalyticsController.platform);
router.get('/restaurants', validate({ query: adminRangeQuerySchema }), AdminAnalyticsController.restaurants);
router.get('/revenue', validate({ query: adminRangeQuerySchema }), AdminAnalyticsController.revenue);
router.get('/providers', validate({ query: adminRangeQuerySchema }), AdminAnalyticsController.providers);

export default router;
