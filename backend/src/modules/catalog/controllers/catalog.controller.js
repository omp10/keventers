import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { catalogService } from '../services/catalog.service.js';
import { importExportService } from '../services/import-export.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;

export const CatalogController = {
  /** Full published catalog (cached public view). */
  full: asyncHandler(async (req, res) => {
    const data = await catalogService.getFullCatalog(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),

  menu: asyncHandler(async (req, res) => {
    const data = await catalogService.getPublicMenu(req.tenant, restaurantIdOf(req), req.params.menuId);
    ApiResponse.success(res, { data });
  }),

  stats: asyncHandler(async (req, res) => {
    const data = await catalogService.getCatalogStats(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),

  // --- import / export (extension points) ---
  importProducts: asyncHandler(async (req, res) => {
    const data = await importExportService.importProducts(
      req.tenant,
      restaurantIdOf(req),
      req.file,
      req.body ?? {},
      actor(req),
    );
    ApiResponse.success(res, { data });
  }),

  exportProducts: asyncHandler(async (req, res) => {
    const data = await importExportService.exportProducts(
      req.tenant,
      restaurantIdOf(req),
      req.validatedQuery ?? {},
      actor(req),
    );
    ApiResponse.success(res, { data });
  }),
};

export default CatalogController;
