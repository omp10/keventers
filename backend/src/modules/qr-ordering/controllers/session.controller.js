import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { sessionService } from '../services/session.service.js';

import { actor, branchIdOf, restaurantIdOf } from './_helpers.js';

/** Staff-facing (restaurant manager / branch manager) session views + control. */
export const SessionController = {
  list: asyncHandler(async (req, res) => {
    const data = await sessionService.listSessions(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await sessionService.getSessionForStaff(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  terminate: asyncHandler(async (req, res) => {
    const data = await sessionService.terminateSession(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  /** Force-release a table: terminate its live sessions and free it. */
  releaseTable: asyncHandler(async (req, res) => {
    const data = await sessionService.releaseTable(req.tenant, req.body.tableId, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default SessionController;
