import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { menuService } from '../services/menu.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;

export const MenuController = {
  create: asyncHandler(async (req, res) => {
    const data = await menuService.createMenu(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await menuService.listMenus(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await menuService.getMenu(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await menuService.updateMenu(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await menuService.deleteMenu(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  publish: asyncHandler(async (req, res) => {
    const data = await menuService.publishMenu(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  archive: asyncHandler(async (req, res) => {
    const data = await menuService.archiveMenu(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default MenuController;
