import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { publicMenuService } from '../services/public-menu.service.js';

/**
 * PUBLIC MENU controller — the customer app's read of a branch's catalog.
 * Unauthenticated: a guest browses the menu before any session exists.
 */
export const PublicMenuController = {
  /** GET /public/branches/:slug/menu */
  branchMenu: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await publicMenuService.branchMenu(req.params.slug) });
  }),

  /** GET /public/branches/:slug/menu/search?q= */
  search: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await publicMenuService.search(req.params.slug, req.query.q) });
  }),

  /** GET /public/branches/:slug/menu/recent */
  recent: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await publicMenuService.recentlyOrdered(req.params.slug) });
  }),

  /** GET /public/branches/:slug/products/:productSlug */
  product: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await publicMenuService.product(req.params.slug, req.params.productSlug) });
  }),
};

export default PublicMenuController;
