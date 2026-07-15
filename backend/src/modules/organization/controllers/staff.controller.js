import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { staffService } from '../services/staff.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.query.restaurantId || undefined;

export const StaffController = {
  list: asyncHandler(async (req, res) => {
    const data = await staffService.listStaff(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  invite: asyncHandler(async (req, res) => {
    const data = await staffService.inviteStaff(req.tenant, req.body.restaurantId, req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await staffService.removeStaff(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default StaffController;
