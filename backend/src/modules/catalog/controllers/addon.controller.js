import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { addonService } from '../services/addon.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;

export const AddonController = {
  create: asyncHandler(async (req, res) => {
    const data = await addonService.createAddon(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await addonService.listAddons(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await addonService.getAddon(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await addonService.updateAddon(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  uploadImage: asyncHandler(async (req, res) => {
    const data = await addonService.uploadImage(req.tenant, req.params.id, req.file, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await addonService.deleteAddon(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default AddonController;
