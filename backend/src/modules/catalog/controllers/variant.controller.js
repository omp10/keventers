import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { variantService } from '../services/variant.service.js';

const actor = (req) => req.principal?.id ?? null;

export const VariantController = {
  // Nested under a product: /products/:productId/variants
  create: asyncHandler(async (req, res) => {
    const data = await variantService.createVariant(req.tenant, req.params.productId, req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await variantService.listVariants(req.tenant, req.params.productId);
    ApiResponse.success(res, { data });
  }),

  // Direct: /variants/:id
  getById: asyncHandler(async (req, res) => {
    const data = await variantService.getVariant(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await variantService.updateVariant(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await variantService.deleteVariant(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default VariantController;
