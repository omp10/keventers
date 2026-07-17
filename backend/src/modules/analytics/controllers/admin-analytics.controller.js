import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { adminAnalyticsService } from '../services/admin-analytics.service.js';

import { adminScopeOf, organizationIdOf, rangeOf } from './_helpers.js';

/**
 * Platform admin analytics endpoints (Super Admin). Aggregates projections across
 * all tenants, optionally narrowed to one organization, restaurant or branch.
 * Reads projections only.
 */
export const AdminAnalyticsController = {
  platform: asyncHandler(async (req, res) => {
    const data = await adminAnalyticsService.platform(rangeOf(req), adminScopeOf(req));
    ApiResponse.success(res, { data });
  }),
  restaurants: asyncHandler(async (req, res) => {
    const data = await adminAnalyticsService.restaurants({ organizationId: organizationIdOf(req) });
    ApiResponse.success(res, { data });
  }),
  revenue: asyncHandler(async (req, res) => {
    const data = await adminAnalyticsService.revenue(rangeOf(req), adminScopeOf(req));
    ApiResponse.success(res, { data });
  }),
  providers: asyncHandler(async (req, res) => {
    const data = await adminAnalyticsService.providers(rangeOf(req), { organizationId: organizationIdOf(req) });
    ApiResponse.success(res, { data });
  }),
};

export default AdminAnalyticsController;
