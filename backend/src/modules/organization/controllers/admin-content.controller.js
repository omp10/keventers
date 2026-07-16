import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { adminKitchenService } from '../services/admin-kitchen.service.js';
import { categoryService } from '../services/category.service.js';
import { mediaService } from '../services/media.service.js';
import { zoneService } from '../services/zone.service.js';

const actorOf = (req) => req.principal?.id ?? null;

/**
 * PLATFORM CONTENT ADMINISTRATION — the storefront surfaces admins curate:
 * browse categories, operating zones, outlet ("kitchen") discovery profiles,
 * and the image pipeline they all upload through. Grouped because they form one
 * cohesive admin capability; each delegates to its own service.
 */

export const CategoryAdminController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await categoryService.list(req.query);
    ApiResponse.success(res, { data: items, meta });
  }),
  create: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await categoryService.create(req.body, actorOf(req)), statusCode: 201 });
  }),
  update: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await categoryService.update(req.params.id, req.body, actorOf(req)) });
  }),
  remove: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await categoryService.remove(req.params.id, actorOf(req)) });
  }),
  reorder: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await categoryService.reorder(req.body.ids, actorOf(req)) });
  }),
};

export const ZoneAdminController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await zoneService.list(req.query);
    ApiResponse.success(res, { data: items, meta });
  }),
  create: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await zoneService.create(req.body, actorOf(req)), statusCode: 201 });
  }),
  update: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await zoneService.update(req.params.id, req.body, actorOf(req)) });
  }),
  remove: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await zoneService.remove(req.params.id, actorOf(req)) });
  }),
};

export const KitchenAdminController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await adminKitchenService.list(req.query);
    ApiResponse.success(res, { data: items, meta });
  }),
  /** Restaurant picker options for the kitchen form. Declared before `:id`. */
  restaurants: asyncHandler(async (_req, res) => {
    ApiResponse.success(res, { data: await adminKitchenService.restaurantOptions() });
  }),
  get: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await adminKitchenService.get(req.params.id) });
  }),
  create: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await adminKitchenService.create(req.body, actorOf(req)), statusCode: 201 });
  }),
  update: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await adminKitchenService.update(req.params.id, req.body, actorOf(req)) });
  }),
  remove: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await adminKitchenService.remove(req.params.id, actorOf(req)) });
  }),
};

export const MediaController = {
  /** POST /media/upload — multipart `file` → Storage Platform → public URL. */
  upload: asyncHandler(async (req, res) => {
    const data = await mediaService.uploadImage(req.file, {
      folder: req.query.folder ?? 'platform',
      actorId: actorOf(req),
    });
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
};

/** PUBLIC storefront reads for admin-curated content. */
export const PublicContentController = {
  categories: asyncHandler(async (_req, res) => {
    ApiResponse.success(res, { data: await categoryService.listLive() });
  }),
  zones: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await zoneService.listLive(req.query) });
  }),
};
