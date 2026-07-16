import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { BANNER_PLACEMENT } from '../models/banner.model.js';
import { bannerService } from '../services/banner.service.js';
import { publicDiscoveryService } from '../services/public-discovery.service.js';

/**
 * PUBLIC DISCOVERY controller — the unauthenticated customer read surface.
 * List endpoints reply with `data: items[]` + pagination fields in `meta`
 * (the shape the customer app's `api.paginate` consumes).
 */
export const PublicDiscoveryController = {
  /** GET /public/discovery/nearby — geo-ranked branches around an origin. */
  nearby: asyncHandler(async (req, res) => {
    const { items, meta } = await publicDiscoveryService.list({ ...req.query, sort: req.query.sort ?? 'nearest' });
    ApiResponse.success(res, { data: items, meta });
  }),

  /** GET /public/discovery/search — filtered/sorted search. */
  search: asyncHandler(async (req, res) => {
    const { items, meta } = await publicDiscoveryService.list(req.query);
    ApiResponse.success(res, { data: items, meta });
  }),

  /** GET /public/discovery/popular — curated popular rail. */
  popular: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await publicDiscoveryService.popular(req.query) });
  }),

  /** GET /public/discovery/featured — featured/promoted rail. */
  featured: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await publicDiscoveryService.featured(req.query) });
  }),

  /** GET /public/discovery/suggest — search-bar autocomplete. */
  suggest: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await publicDiscoveryService.suggest(req.query.q) });
  }),

  /** GET /public/branches/:slug — full branch detail by SEO slug. */
  branchBySlug: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await publicDiscoveryService.branchBySlug(req.params.slug, req.query) });
  }),

  /** GET /public/banners — live, admin-curated promotional banners. */
  banners: asyncHandler(async (req, res) => {
    const placement = req.query.placement ?? BANNER_PLACEMENT.CUSTOMER_HOME;
    ApiResponse.success(res, { data: await bannerService.listLive(placement) });
  }),
};

export default PublicDiscoveryController;
