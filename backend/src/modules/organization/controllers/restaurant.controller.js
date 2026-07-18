import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { restaurantService } from '../services/restaurant.service.js';
import { restaurantOnboardingService } from '../services/restaurant-onboarding.service.js';

const actor = (req) => req.principal?.id ?? null;
const restaurantIdOf = (req) => req.query.restaurantId || undefined;

export const RestaurantController = {
  /**
   * GET /restaurant/context — the signed-in staff member's operational scope
   * (restaurant + branch) and the socket ROOMS to join for live events.
   *
   * The dashboard, KDS and staff apps all read this to know which realtime
   * rooms to subscribe to. It was never implemented, so the KDS/staff joined NO
   * room and never heard a new-order event (or its sound). Rooms mirror what
   * the kitchen/order realtime services emit to: the restaurant room (catches
   * every branch) plus the specific branch room when the member has one.
   */
  getContext: asyncHandler(async (req, res) => {
    const t = req.tenant;
    const restaurantId = t.primaryRestaurantId ?? t.restaurantIds?.[0] ?? null;
    const branchId = t.branchIds?.[0] ?? null;
    const rooms = [];
    if (restaurantId) rooms.push(`restaurant:${restaurantId}`);
    if (branchId) rooms.push(`branch:${branchId}`);

    let restaurantName = '';
    if (restaurantId) {
      const profile = await restaurantService.getPublicProfile(restaurantId).catch(() => null);
      restaurantName = profile?.name ?? '';
    }
    ApiResponse.success(res, { data: { restaurantId, restaurantName, branchId, rooms } });
  }),

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
