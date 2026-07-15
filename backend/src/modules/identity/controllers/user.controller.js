import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { userService } from '../services/user.service.js';

/** Thin HTTP layer: no business logic — delegate to the service. */
const actor = (req) => req.principal?.id ?? null;

export const UserController = {
  create: asyncHandler(async (req, res) => {
    const data = await userService.createUser(req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await userService.listUsers(req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await userService.getUser(req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await userService.updateUser(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const data = await userService.updateProfile(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  disable: asyncHandler(async (req, res) => {
    const data = await userService.disableUser(req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  enable: asyncHandler(async (req, res) => {
    const data = await userService.enableUser(req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await userService.deleteUser(req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  assignRoles: asyncHandler(async (req, res) => {
    const data = await userService.assignRoles(req.params.id, req.body.roles, actor(req));
    ApiResponse.success(res, { data });
  }),

  removeRoles: asyncHandler(async (req, res) => {
    const data = await userService.removeRoles(req.params.id, req.body.roles, actor(req));
    ApiResponse.success(res, { data });
  }),

  assignPermissions: asyncHandler(async (req, res) => {
    const data = await userService.assignPermissions(req.params.id, req.body.permissions, actor(req));
    ApiResponse.success(res, { data });
  }),

  removePermissions: asyncHandler(async (req, res) => {
    const data = await userService.removePermissions(req.params.id, req.body.permissions, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default UserController;
