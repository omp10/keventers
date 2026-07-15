import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { staffService } from '../services/staff.service.js';

const actor = (req) => req.principal?.id ?? null;

export const StaffController = {
  create: asyncHandler(async (req, res) => {
    const data = await staffService.createStaff(req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await staffService.listStaff(req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await staffService.getStaff(req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await staffService.updateStaff(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default StaffController;
