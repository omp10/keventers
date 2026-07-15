import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { roleService } from '../services/role.service.js';

const actor = (req) => req.principal?.id ?? null;

export const RoleController = {
  create: asyncHandler(async (req, res) => {
    const data = await roleService.createRole(req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await roleService.listRoles(req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await roleService.getRole(req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await roleService.updateRole(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  addPermissions: asyncHandler(async (req, res) => {
    const data = await roleService.setPermissions(req.params.id, req.body.permissions, 'add', actor(req));
    ApiResponse.success(res, { data });
  }),

  removePermissions: asyncHandler(async (req, res) => {
    const data = await roleService.setPermissions(req.params.id, req.body.permissions, 'remove', actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await roleService.deleteRole(req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default RoleController;
