import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { qrService } from '../services/qr.service.js';

import { actor } from './_helpers.js';

export const QrController = {
  /** Generate a new active QR for a table. */
  generate: asyncHandler(async (req, res) => {
    const data = await qrService.generateForTable(req.tenant, req.body.tableId, req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await qrService.getQr(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  listByTable: asyncHandler(async (req, res) => {
    const data = await qrService.listByTable(req.tenant, req.params.tableId);
    ApiResponse.success(res, { data });
  }),

  regenerate: asyncHandler(async (req, res) => {
    const data = await qrService.regenerate(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  rotate: asyncHandler(async (req, res) => {
    const data = await qrService.rotateSecret(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  enable: asyncHandler(async (req, res) => {
    const data = await qrService.enable(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  disable: asyncHandler(async (req, res) => {
    const data = await qrService.disable(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await qrService.deleteQr(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default QrController;
