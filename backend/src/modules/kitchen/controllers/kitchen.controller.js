import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { kitchenService } from '../services/kitchen.service.js';

import { actor, branchIdOf, restaurantIdOf } from './_helpers.js';

export const KitchenController = {
  queue: asyncHandler(async (req, res) => {
    const data = await kitchenService.getBoard(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getEntry: asyncHandler(async (req, res) => {
    const data = await kitchenService.getEntry(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  assign: asyncHandler(async (req, res) => {
    const data = await kitchenService.assign(req.tenant, req.params.id, req.body ?? {}, actor(req));
    ApiResponse.success(res, { data });
  }),

  preparing: asyncHandler(async (req, res) => {
    const data = await kitchenService.startPreparing(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  ready: asyncHandler(async (req, res) => {
    const data = await kitchenService.markReady(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  served: asyncHandler(async (req, res) => {
    const data = await kitchenService.markServed(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  recall: asyncHandler(async (req, res) => {
    const data = await kitchenService.recall(req.tenant, req.params.id, req.body ?? {}, actor(req));
    ApiResponse.success(res, { data });
  }),

  refire: asyncHandler(async (req, res) => {
    const data = await kitchenService.refire(req.tenant, req.params.id, req.body ?? {}, actor(req));
    ApiResponse.success(res, { data });
  }),

  setPriority: asyncHandler(async (req, res) => {
    const data = await kitchenService.setPriority(req.tenant, req.params.id, req.body.priority, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default KitchenController;
