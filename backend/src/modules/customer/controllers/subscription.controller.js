import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { customerService } from '../services/customer.service.js';
import { subscriptionService } from '../services/subscription.service.js';
import { customerScopeOf } from './_helpers.js';

/** Management tenant: the caller's primary restaurant (same rule as loyalty). */
const tenantOf = (req) => ({
  organizationId: req.tenant.primaryOrganizationId ?? req.tenant.organizationIds?.[0],
  restaurantId: req.query?.restaurantId ?? req.tenant.primaryRestaurantId,
});

export const SubscriptionController = {
  /* ── management (dashboard CMS) ── */
  listPlans: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await subscriptionService.listPlans(tenantOf(req), { includeArchived: true }) });
  }),
  createPlan: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await subscriptionService.createPlan(tenantOf(req), req.body), statusCode: 201 });
  }),
  updatePlan: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await subscriptionService.updatePlan(tenantOf(req), req.params.id, req.body) });
  }),
  archivePlan: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await subscriptionService.archivePlan(tenantOf(req), req.params.id) });
  }),
  listSubscribers: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await subscriptionService.listSubscribers(tenantOf(req), req.validatedQuery ?? {}) });
  }),
  activate: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await subscriptionService.activate(tenantOf(req), req.params.id) });
  }),
  cancel: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await subscriptionService.cancel(tenantOf(req), req.params.id) });
  }),

  /* ── customer ── */
  plans: asyncHandler(async (req, res) => {
    const scope = customerScopeOf(req);
    ApiResponse.success(res, { data: await subscriptionService.listPublicPlans(scope) });
  }),
  subscribe: asyncHandler(async (req, res) => {
    const scope = customerScopeOf(req);
    const { customerId } = await customerService.ensureCustomer(
      { organizationId: scope.organizationId, restaurantId: scope.restaurantId },
      scope.userId,
    );
    const data = await subscriptionService.subscribe(scope, { customerId, userId: scope.userId }, req.body.planId);
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
  mine: asyncHandler(async (req, res) => {
    const scope = customerScopeOf(req);
    const { customerId } = await customerService.ensureCustomer(
      { organizationId: scope.organizationId, restaurantId: scope.restaurantId },
      scope.userId,
    );
    ApiResponse.success(res, { data: await subscriptionService.listForCustomer(customerId) });
  }),
};

export default SubscriptionController;
