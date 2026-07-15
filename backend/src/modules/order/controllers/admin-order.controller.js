import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { orderService } from '../services/order.service.js';

/**
 * Platform Super-Admin order inspection (read-only). Requires an explicit
 * ?restaurantId= (a super admin has no primary tenant); tenant isolation still
 * applies when the scope is resolved.
 */
const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;
const branchIdOf = (req) => req.validatedQuery?.branchId ?? req.query?.branchId ?? undefined;

export const AdminOrderController = {
  list: asyncHandler(async (req, res) => {
    const data = await orderService.listForStaff(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await orderService.getForStaff(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),
};

export default AdminOrderController;
