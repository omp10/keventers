import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { dashboardService } from '../services/dashboard.service.js';
import { exportService } from '../services/export.service.js';
import { rebuildService } from '../services/rebuild.service.js';

import { actor, rangeOf, restaurantIdOf } from './_helpers.js';

/**
 * Restaurant analytics endpoints — every dashboard reads from projections. Range
 * comes from the query (defaults to the last 30 days at day granularity).
 */
export const RestaurantAnalyticsController = {
  dashboard: asyncHandler(async (req, res) => {
    const data = await dashboardService.dashboard(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),
  sales: asyncHandler(async (req, res) => {
    const data = await dashboardService.sales(req.tenant, restaurantIdOf(req), rangeOf(req));
    ApiResponse.success(res, { data });
  }),
  orders: asyncHandler(async (req, res) => {
    const data = await dashboardService.orders(req.tenant, restaurantIdOf(req), rangeOf(req));
    ApiResponse.success(res, { data });
  }),
  products: asyncHandler(async (req, res) => {
    const data = await dashboardService.products(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),
  customers: asyncHandler(async (req, res) => {
    const data = await dashboardService.customers(req.tenant, restaurantIdOf(req), rangeOf(req));
    ApiResponse.success(res, { data });
  }),
  kitchen: asyncHandler(async (req, res) => {
    const data = await dashboardService.kitchen(req.tenant, restaurantIdOf(req), rangeOf(req));
    ApiResponse.success(res, { data });
  }),
  payments: asyncHandler(async (req, res) => {
    const data = await dashboardService.payments(req.tenant, restaurantIdOf(req), rangeOf(req));
    ApiResponse.success(res, { data });
  }),
  qr: asyncHandler(async (req, res) => {
    const data = await dashboardService.qr(req.tenant, restaurantIdOf(req), rangeOf(req));
    ApiResponse.success(res, { data });
  }),

  // exports
  export: asyncHandler(async (req, res) => {
    const q = req.validatedQuery ?? req.query ?? {};
    const out = await exportService.exportReport(req.tenant, restaurantIdOf(req), { report: q.report, format: q.format, range: rangeOf(req) }, actor(req));
    res.setHeader('Content-Type', out.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.status(200).send(out.content);
  }),

  // rebuild / reconciliation
  rebuild: asyncHandler(async (req, res) => {
    const data = await rebuildService.fullRebuild(req.tenant, restaurantIdOf(req), actor(req));
    ApiResponse.success(res, { data, statusCode: 202 });
  }),
  reconcile: asyncHandler(async (req, res) => {
    const data = await rebuildService.reconcile(req.tenant, restaurantIdOf(req), rangeOf(req), actor(req));
    ApiResponse.success(res, { data });
  }),
  listRuns: asyncHandler(async (req, res) => {
    const data = await rebuildService.listRuns(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),
};

export default RestaurantAnalyticsController;
