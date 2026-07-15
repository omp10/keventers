import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { permissionService } from '../services/permission.service.js';

const actor = (req) => req.principal?.id ?? null;

export const PermissionController = {
  create: asyncHandler(async (req, res) => {
    const data = await permissionService.createPermission(req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await permissionService.listPermissions(req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await permissionService.getPermission(req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await permissionService.updatePermission(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await permissionService.deletePermission(req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default PermissionController;
