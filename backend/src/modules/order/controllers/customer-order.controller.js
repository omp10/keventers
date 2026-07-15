import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { orderService } from '../services/order.service.js';
import { buildGuestScope } from '../utils/tenant.util.js';

/** Customer orders are scoped to the guest session (req.guest), never the client. */
const scopeOf = (req) => buildGuestScope(req.guest);
const idempotencyKeyOf = (req) => req.headers['idempotency-key'] || undefined;

export const CustomerOrderController = {
  /** POST /api/v1/orders — checkout the active cart into an order. */
  checkout: asyncHandler(async (req, res) => {
    const data = await orderService.checkout(scopeOf(req), { idempotencyKey: idempotencyKeyOf(req) });
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await orderService.listForGuest(scopeOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await orderService.getForGuest(scopeOf(req), req.params.id);
    ApiResponse.success(res, { data });
  }),

  cancel: asyncHandler(async (req, res) => {
    const data = await orderService.cancelByCustomer(scopeOf(req), req.params.id, req.body ?? {});
    ApiResponse.success(res, { data });
  }),
};

export default CustomerOrderController;
