import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { tableGroupService } from '../services/table-group.service.js';

import { actor, branchIdOf, restaurantIdOf } from './_helpers.js';

export const TableGroupController = {
  create: asyncHandler(async (req, res) => {
    const data = await tableGroupService.createGroup(req.tenant, restaurantIdOf(req), branchIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await tableGroupService.listGroups(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await tableGroupService.getGroup(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await tableGroupService.updateGroup(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await tableGroupService.deleteGroup(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default TableGroupController;
