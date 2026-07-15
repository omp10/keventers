import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { availabilityService } from '../services/availability.service.js';
import { productService } from '../services/product.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;

export const ProductController = {
  create: asyncHandler(async (req, res) => {
    const data = await productService.createProduct(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await productService.listProducts(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await productService.getProduct(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  detail: asyncHandler(async (req, res) => {
    const data = await productService.getProductDetail(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await productService.updateProduct(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await productService.deleteProduct(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  // --- images ---
  uploadImages: asyncHandler(async (req, res) => {
    const data = await productService.uploadImages(req.tenant, req.params.id, req.files ?? [], actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  removeImage: asyncHandler(async (req, res) => {
    const data = await productService.removeImage(req.tenant, req.params.id, req.body.imageKey, actor(req));
    ApiResponse.success(res, { data });
  }),

  // --- availability ---
  setAvailability: asyncHandler(async (req, res) => {
    const data = await availabilityService.setProductAvailability(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  listOverrides: asyncHandler(async (req, res) => {
    const data = await availabilityService.listOverrides(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  setBranchOverride: asyncHandler(async (req, res) => {
    const { branchId, ...rest } = req.body;
    const data = await availabilityService.setBranchOverride(req.tenant, req.params.id, branchId, rest, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
};

export default ProductController;
