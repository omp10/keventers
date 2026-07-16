import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { bannerService } from '../services/banner.service.js';

const actorOf = (req) => req.principal?.id ?? null;

/** ADMIN banner curation — the "banners are admin managed" surface. */
export const BannerAdminController = {
  /** GET /admin/banners — paginated list (any status). */
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await bannerService.list(req.query);
    ApiResponse.success(res, { data: items, meta });
  }),

  /** POST /admin/banners — create a banner. */
  create: asyncHandler(async (req, res) => {
    const banner = await bannerService.create(req.body, actorOf(req));
    ApiResponse.success(res, { data: banner, statusCode: 201 });
  }),

  /** PATCH /admin/banners/:id — update content/scheduling/status/order. */
  update: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await bannerService.update(req.params.id, req.body, actorOf(req)) });
  }),

  /** DELETE /admin/banners/:id — soft-delete a banner. */
  remove: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await bannerService.remove(req.params.id, actorOf(req)) });
  }),
};

export default BannerAdminController;
