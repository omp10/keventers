import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { adminRestaurantService } from '../services/admin-restaurant.service.js';

const actor = (req) => req.principal?.id ?? null;

/** Platform-admin brand (restaurant) management. */
export const AdminRestaurantController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await adminRestaurantService.list(req.validatedQuery ?? req.query ?? {});
    ApiResponse.success(res, { data: items, meta });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await adminRestaurantService.getById(req.params.id);
    ApiResponse.success(res, { data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await adminRestaurantService.create(req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await adminRestaurantService.update(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default AdminRestaurantController;
