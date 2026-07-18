import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { upsellService } from '../services/upsell.service.js';

const tenantOf = (req) => ({
  organizationId: req.tenant.primaryOrganizationId ?? req.tenant.organizationIds?.[0],
  restaurantId: req.query?.restaurantId ?? req.tenant.primaryRestaurantId,
});

export const UpsellController = {
  /** POST /public/branches/:slug/upsell — ranked suggestions for seeds/cart. */
  recommend: asyncHandler(async (req, res) => {
    const { seedIds = [], excludeIds = [], limit } = req.body ?? {};
    const data = await upsellService.recommend(req.params.slug, { seedIds, excludeIds, limit });
    ApiResponse.success(res, { data });
  }),

  /* management (dashboard CMS) */
  listRules: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await upsellService.listRules(tenantOf(req)) });
  }),
  createRule: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await upsellService.createRule(tenantOf(req), req.body), statusCode: 201 });
  }),
  updateRule: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await upsellService.updateRule(tenantOf(req), req.params.id, req.body) });
  }),
  removeRule: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await upsellService.removeRule(tenantOf(req), req.params.id) });
  }),
  learned: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await upsellService.learnedPairs(tenantOf(req)) });
  }),
};

export default UpsellController;
