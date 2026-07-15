import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { RestaurantAnalyticsController } from '../controllers/restaurant-analytics.controller.js';
import {
  exportQuerySchema,
  rangeQuerySchema,
  reconcileBodySchema,
  runsQuerySchema,
} from '../validators/analytics.validators.js';

import { managementGuards, requireExport, requireRebuild } from './_guards.js';

const router = Router();
router.use(...managementGuards);

/**
 * @openapi
 * /api/v1/restaurant/analytics/dashboard:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Headline KPI dashboard (today), responses: { 200: { description: Dashboard } } }
 * /api/v1/restaurant/analytics/sales:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Sales analytics (range + series), responses: { 200: { description: Sales } } }
 * /api/v1/restaurant/analytics/orders:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Order analytics + peak hours/days, responses: { 200: { description: Orders } } }
 * /api/v1/restaurant/analytics/products:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Best/worst products, category revenue, modifier/add-on usage, responses: { 200: { description: Products } } }
 * /api/v1/restaurant/analytics/customers:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Customer analytics, responses: { 200: { description: Customers } } }
 * /api/v1/restaurant/analytics/kitchen:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Kitchen analytics (SLA, prep time, chef/station), responses: { 200: { description: Kitchen } } }
 * /api/v1/restaurant/analytics/payments:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Payment analytics + provider distribution, responses: { 200: { description: Payments } } }
 * /api/v1/restaurant/analytics/qr:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: QR + table analytics (funnel, utilization), responses: { 200: { description: QR } } }
 * /api/v1/restaurant/analytics/export:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Export a report (CSV), responses: { 200: { description: File } } }
 * /api/v1/restaurant/analytics/rebuild:
 *   post: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Trigger a full projection rebuild, responses: { 202: { description: Rebuild run } } }
 * /api/v1/restaurant/analytics/reconcile:
 *   post: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: Reconcile projections vs authoritative data (reports only), responses: { 200: { description: Reconciliation report } } }
 * /api/v1/restaurant/analytics/runs:
 *   get: { tags: [Analytics - Restaurant], security: [{ bearerAuth: [] }], summary: List rebuild/reconciliation runs, responses: { 200: { description: Runs } } }
 */
router.get('/dashboard', RestaurantAnalyticsController.dashboard);
router.get('/sales', validate({ query: rangeQuerySchema }), RestaurantAnalyticsController.sales);
router.get('/orders', validate({ query: rangeQuerySchema }), RestaurantAnalyticsController.orders);
router.get('/products', RestaurantAnalyticsController.products);
router.get('/customers', validate({ query: rangeQuerySchema }), RestaurantAnalyticsController.customers);
router.get('/kitchen', validate({ query: rangeQuerySchema }), RestaurantAnalyticsController.kitchen);
router.get('/payments', validate({ query: rangeQuerySchema }), RestaurantAnalyticsController.payments);
router.get('/qr', validate({ query: rangeQuerySchema }), RestaurantAnalyticsController.qr);
router.get('/export', validate({ query: exportQuerySchema }), requireExport, RestaurantAnalyticsController.export);
router.get('/runs', validate({ query: runsQuerySchema }), RestaurantAnalyticsController.listRuns);
router.post('/rebuild', requireRebuild, RestaurantAnalyticsController.rebuild);
router.post('/reconcile', validate({ query: rangeQuerySchema, body: reconcileBodySchema }), requireRebuild, RestaurantAnalyticsController.reconcile);

export default router;
