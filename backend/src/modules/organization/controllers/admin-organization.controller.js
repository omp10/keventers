import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { organizationService } from '../services/organization.service.js';
import { subscriptionService } from '../services/subscription.service.js';

const actor = (req) => req.principal?.id ?? null;

export const AdminOrganizationController = {
  list: asyncHandler(async (req, res) => {
    const data = await organizationService.listOrganizations(req.validatedQuery ?? {}, req.tenant);
    ApiResponse.success(res, { data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await organizationService.getOrganization(req.params.id, req.tenant);
    ApiResponse.success(res, { data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await organizationService.createOrganization(req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await organizationService.updateOrganization(req.params.id, req.body, req.tenant, actor(req));
    ApiResponse.success(res, { data });
  }),

  suspend: asyncHandler(async (req, res) => {
    const data = await organizationService.suspend(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  activate: asyncHandler(async (req, res) => {
    const data = await organizationService.activate(req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await organizationService.deleteOrganization(req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  getSubscription: asyncHandler(async (req, res) => {
    const data = await subscriptionService.getSubscription(req.params.id, req.tenant);
    ApiResponse.success(res, { data });
  }),

  updateSubscription: asyncHandler(async (req, res) => {
    const data = await subscriptionService.transition(req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default AdminOrganizationController;
