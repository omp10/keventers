import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { orderService } from '../services/order.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;
const branchIdOf = (req) => req.validatedQuery?.branchId ?? req.query?.branchId ?? undefined;

export const RestaurantOrderController = {
  /**
   * GET /restaurant/orders/:id/bill — the whole TABLE SESSION's bill, not just
   * this order. A sitting usually spans several orders; billing them separately
   * hands the guest three receipts for one meal.
   */
  bill: asyncHandler(async (req, res) => {
    const data = await orderService.getSessionBill(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await orderService.listForStaff(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await orderService.getForStaff(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const data = await orderService.updateStatus(req.tenant, req.params.id, req.body.status, { reason: req.body.reason }, actor(req));
    ApiResponse.success(res, { data });
  }),

  confirm: asyncHandler(async (req, res) => {
    const data = await orderService.confirm(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  prepare: asyncHandler(async (req, res) => {
    const data = await orderService.prepare(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  ready: asyncHandler(async (req, res) => {
    const data = await orderService.ready(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  serve: asyncHandler(async (req, res) => {
    const data = await orderService.serve(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  complete: asyncHandler(async (req, res) => {
    const data = await orderService.complete(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  cancel: asyncHandler(async (req, res) => {
    const data = await orderService.cancelByStaff(req.tenant, req.params.id, req.body ?? {}, actor(req));
    ApiResponse.success(res, { data });
  }),

  addNote: asyncHandler(async (req, res) => {
    const data = await orderService.addNote(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  requestRefund: asyncHandler(async (req, res) => {
    const data = await orderService.requestRefund(req.tenant, req.params.id, req.body ?? {}, actor(req));
    ApiResponse.success(res, { data });
  }),

  approveRefund: asyncHandler(async (req, res) => {
    const data = await orderService.approveRefund(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  rejectRefund: asyncHandler(async (req, res) => {
    const data = await orderService.rejectRefund(req.tenant, req.params.id, req.body ?? {}, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default RestaurantOrderController;
