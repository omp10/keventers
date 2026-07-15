import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { categoryService } from '../services/category.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;

export const CategoryController = {
  create: asyncHandler(async (req, res) => {
    const data = await categoryService.createCategory(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await categoryService.listCategories(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  tree: asyncHandler(async (req, res) => {
    const data = await categoryService.getCategoryTree(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await categoryService.getCategory(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await categoryService.updateCategory(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await categoryService.deleteCategory(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default CategoryController;
