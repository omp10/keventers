import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { campaignService } from '../services/campaign.service.js';
import { broadcastService } from '../services/broadcast.service.js';
import { notificationService } from '../services/notification.service.js';
import { outboxService } from '../services/outbox.service.js';

import { actor, queryOf, restaurantIdOf } from './_helpers.js';

/**
 * Platform admin notification endpoints (Super Admin). Cross-tenant delivery
 * visibility, campaign oversight, and outbox/dead-letter inspection + requeue.
 */
export const AdminNotificationController = {
  /**
   * POST /admin/notifications/broadcast — one announcement to a restaurant's
   * customers/staff, fanned out through the normal outbox pipeline.
   */
  broadcast: asyncHandler(async (req, res) => {
    const data = await broadcastService.broadcast(req.tenant, req.body, req.principal?.id ?? null);
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await notificationService.listForStaff(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),

  listCampaigns: asyncHandler(async (req, res) => {
    const data = await campaignService.listCampaigns(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),

  /** Inspect the outbox / dead-letter queue. */
  listOutbox: asyncHandler(async (req, res) => {
    const data = await outboxService.listForStaff(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),

  /** Requeue a dead-lettered outbox row. */
  requeueOutbox: asyncHandler(async (req, res) => {
    const data = await outboxService.requeue(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default AdminNotificationController;
