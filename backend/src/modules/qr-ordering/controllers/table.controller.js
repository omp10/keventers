import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { tableService } from '../services/table.service.js';

import { actor, branchIdOf, restaurantIdOf } from './_helpers.js';

export const TableController = {
  create: asyncHandler(async (req, res) => {
    const data = await tableService.createTable(req.tenant, restaurantIdOf(req), branchIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await tableService.listTables(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await tableService.getTable(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await tableService.updateTable(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  setStatus: asyncHandler(async (req, res) => {
    const data = await tableService.setStatus(req.tenant, req.params.id, req.body.status, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await tableService.deleteTable(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default TableController;
