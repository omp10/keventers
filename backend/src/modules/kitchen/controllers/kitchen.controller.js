import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { kitchenService } from '../services/kitchen.service.js';

import { actor, branchIdOf, restaurantIdOf } from './_helpers.js';

export const KitchenController = {
  queue: asyncHandler(async (req, res) => {
    const data = await kitchenService.getBoard(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  /** The roster an order can be assigned to at this outlet, with live workload. */
  chefs: asyncHandler(async (req, res) => {
    const data = await kitchenService.listChefs(req.tenant, restaurantIdOf(req), branchIdOf(req));
    ApiResponse.success(res, { data });
  }),

  /* ── Staff "my work" (chef id always from the principal, never a param) ── */

  myQueue: asyncHandler(async (req, res) => {
    const data = await kitchenService.getMyQueue(req.tenant, req.principal.id, req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  myHistory: asyncHandler(async (req, res) => {
    const data = await kitchenService.getMyHistory(req.tenant, req.principal.id, req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  myTransition: asyncHandler(async (req, res) => {
    const data = await kitchenService.transitionAsChef(req.tenant, req.params.id, req.params.action, actor(req));
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
