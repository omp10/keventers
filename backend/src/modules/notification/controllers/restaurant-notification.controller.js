import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { campaignService } from '../services/campaign.service.js';
import { notificationService } from '../services/notification.service.js';
import { templateService } from '../services/template.service.js';

import { actor, queryOf, restaurantIdOf } from './_helpers.js';

/**
 * Restaurant staff notification endpoints — tenant-scoped delivery history, a
 * manual/test send, template catalog management and campaign management. Every
 * read/write is isolated to the staff member's restaurant.
 */
export const RestaurantNotificationController = {
  // history
  list: asyncHandler(async (req, res) => {
    const data = await notificationService.listForStaff(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),
  get: asyncHandler(async (req, res) => {
    const data = await notificationService.getForStaff(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  // manual / test send
  test: asyncHandler(async (req, res) => {
    const data = await notificationService.testSend(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  // templates
  listTemplates: asyncHandler(async (req, res) => {
    const data = await templateService.listTemplates(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),
  createTemplate: asyncHandler(async (req, res) => {
    const data = await templateService.createTemplate(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
  updateTemplate: asyncHandler(async (req, res) => {
    const data = await templateService.updateTemplate(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),
  deleteTemplate: asyncHandler(async (req, res) => {
    const data = await templateService.deleteTemplate(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),

  // campaigns
  listCampaigns: asyncHandler(async (req, res) => {
    const data = await campaignService.listCampaigns(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),
  createCampaign: asyncHandler(async (req, res) => {
    const data = await campaignService.createCampaign(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
  updateCampaign: asyncHandler(async (req, res) => {
    const data = await campaignService.updateCampaign(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),
  cancelCampaign: asyncHandler(async (req, res) => {
    const data = await campaignService.cancelCampaign(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default RestaurantNotificationController;
