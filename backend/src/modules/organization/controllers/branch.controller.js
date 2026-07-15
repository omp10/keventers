import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { branchService } from '../services/branch.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.query.restaurantId || undefined;

export const BranchController = {
  create: asyncHandler(async (req, res) => {
    const data = await branchService.createBranch(req.tenant, req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await branchService.listBranches(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await branchService.getBranch(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await branchService.updateBranch(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  updateBusinessHours: asyncHandler(async (req, res) => {
    const data = await branchService.updateBusinessHours(
      req.tenant,
      req.params.id,
      req.body.businessHours,
      actor(req),
    );
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await branchService.deleteBranch(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default BranchController;
