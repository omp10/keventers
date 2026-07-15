import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { kitchenService } from '../services/kitchen.service.js';

import { branchIdOf, restaurantIdOf } from './_helpers.js';

/**
 * Platform Super-Admin kitchen inspection (read-only). Requires an explicit
 * ?restaurantId=&branchId=; tenant isolation still applies when the scope is
 * resolved.
 */
export const AdminKitchenController = {
  board: asyncHandler(async (req, res) => {
    const data = await kitchenService.getBoard(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getEntry: asyncHandler(async (req, res) => {
    const data = await kitchenService.getEntry(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),
};

export default AdminKitchenController;
