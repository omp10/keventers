import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { catalogService } from '../services/catalog.service.js';
import { menuService } from '../services/menu.service.js';
import { productService } from '../services/product.service.js';

/**
 * Platform Super-Admin catalog INSPECTION only. Read-only endpoints for
 * troubleshooting any restaurant's catalog. Tenant isolation still applies —
 * the super admin must pass an explicit restaurantId (resolveScope requires it
 * for a super admin, who has no primary restaurant). Restaurant data remains
 * tenant-isolated; this controller never mutates it.
 */
const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;

export const AdminCatalogController = {
  stats: asyncHandler(async (req, res) => {
    const data = await catalogService.getCatalogStats(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),

  fullCatalog: asyncHandler(async (req, res) => {
    const data = await catalogService.getFullCatalog(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),

  listMenus: asyncHandler(async (req, res) => {
    const data = await menuService.listMenus(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  listProducts: asyncHandler(async (req, res) => {
    const data = await productService.listProducts(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  productDetail: asyncHandler(async (req, res) => {
    const data = await productService.getProductDetail(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),
};

export default AdminCatalogController;
