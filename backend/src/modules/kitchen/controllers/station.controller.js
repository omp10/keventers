import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { slaService } from '../services/sla.service.js';
import { stationService } from '../services/station.service.js';

import { actor, branchIdOf, restaurantIdOf } from './_helpers.js';

export const StationController = {
  create: asyncHandler(async (req, res) => {
    const data = await stationService.createStation(req.tenant, restaurantIdOf(req), branchIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await stationService.listStations(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await stationService.getStation(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await stationService.updateStation(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await stationService.deleteStation(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  // --- SLA target config (branch-scoped) ---
  createSla: asyncHandler(async (req, res) => {
    const data = await slaService.createTarget(req.tenant, restaurantIdOf(req), branchIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  listSla: asyncHandler(async (req, res) => {
    const data = await slaService.listTargets(req.tenant, restaurantIdOf(req), branchIdOf(req));
    ApiResponse.success(res, { data });
  }),

  removeSla: asyncHandler(async (req, res) => {
    const data = await slaService.deleteTarget(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default StationController;
