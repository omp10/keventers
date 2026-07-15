import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { modifierService } from '../services/modifier.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;

export const ModifierController = {
  // --- groups ---
  createGroup: asyncHandler(async (req, res) => {
    const data = await modifierService.createGroup(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  listGroups: asyncHandler(async (req, res) => {
    const data = await modifierService.listGroups(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getGroup: asyncHandler(async (req, res) => {
    const data = await modifierService.getGroup(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  updateGroup: asyncHandler(async (req, res) => {
    const data = await modifierService.updateGroup(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  deleteGroup: asyncHandler(async (req, res) => {
    const data = await modifierService.deleteGroup(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  // --- modifiers within a group ---
  addModifier: asyncHandler(async (req, res) => {
    const data = await modifierService.addModifier(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  updateModifier: asyncHandler(async (req, res) => {
    const data = await modifierService.updateModifier(req.tenant, req.params.modifierId, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  removeModifier: asyncHandler(async (req, res) => {
    const data = await modifierService.removeModifier(req.tenant, req.params.modifierId, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default ModifierController;
