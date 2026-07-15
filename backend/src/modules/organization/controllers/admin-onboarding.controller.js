import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { onboardingService } from '../services/onboarding.service.js';

const actor = (req) => req.principal?.id ?? null;

export const AdminOnboardingController = {
  list: asyncHandler(async (req, res) => {
    const data = await onboardingService.listApplications(req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await onboardingService.getApplication(req.params.id);
    ApiResponse.success(res, { data });
  }),

  approve: asyncHandler(async (req, res) => {
    const data = await onboardingService.approve(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  reject: asyncHandler(async (req, res) => {
    const data = await onboardingService.reject(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  requestInformation: asyncHandler(async (req, res) => {
    const data = await onboardingService.requestInformation(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default AdminOnboardingController;
