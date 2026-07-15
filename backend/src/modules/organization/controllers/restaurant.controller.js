import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { restaurantService } from '../services/restaurant.service.js';
import { restaurantOnboardingService } from '../services/restaurant-onboarding.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.query.restaurantId || undefined;

export const RestaurantController = {
  getProfile: asyncHandler(async (req, res) => {
    const data = await restaurantService.getProfile(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const data = await restaurantService.updateProfile(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  getSettings: asyncHandler(async (req, res) => {
    const data = await restaurantService.getProfile(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data: data?.settings ?? null });
  }),

  updateSettings: asyncHandler(async (req, res) => {
    const data = await restaurantService.updateSettings(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  // --- first-login onboarding wizard ---
  getWizard: asyncHandler(async (req, res) => {
    const data = await restaurantOnboardingService.getWizard(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),

  startWizard: asyncHandler(async (req, res) => {
    const data = await restaurantOnboardingService.start(req.tenant, restaurantIdOf(req), actor(req));
    ApiResponse.success(res, { data });
  }),

  submitStep: asyncHandler(async (req, res) => {
    const data = await restaurantOnboardingService.submitStep(
      req.tenant,
      restaurantIdOf(req),
      req.body.step,
      req.body.data ?? {},
      actor(req),
    );
    ApiResponse.success(res, { data });
  }),

  completeWizard: asyncHandler(async (req, res) => {
    const data = await restaurantOnboardingService.complete(req.tenant, restaurantIdOf(req), actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default RestaurantController;
