import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { AdminNotificationController } from '../controllers/admin-notification.controller.js';
import {
  campaignListQuerySchema,
  idParamSchema,
  notificationListQuerySchema,
  outboxListQuerySchema,
} from '../validators/notification.validators.js';

import { adminGuards } from './_guards.js';

/** Platform admin routers (Super Admin). */
export const adminNotificationsRouter = Router();
adminNotificationsRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/notifications:
 *   get: { tags: [Notifications - Admin], security: [{ bearerAuth: [] }], summary: Delivery history (platform), responses: { 200: { description: Notifications } } }
 */
adminNotificationsRouter.get('/', validate({ query: notificationListQuerySchema }), AdminNotificationController.list);

export const adminCampaignsRouter = Router();
adminCampaignsRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/notification-campaigns:
 *   get: { tags: [Notifications - Admin], security: [{ bearerAuth: [] }], summary: Campaigns (platform), responses: { 200: { description: Campaigns } } }
 */
adminCampaignsRouter.get('/', validate({ query: campaignListQuerySchema }), AdminNotificationController.listCampaigns);

export const adminOutboxRouter = Router();
adminOutboxRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/notification-outbox:
 *   get: { tags: [Notifications - Admin], security: [{ bearerAuth: [] }], summary: Inspect the outbox / dead-letter queue, responses: { 200: { description: Outbox } } }
 * /api/v1/admin/notification-outbox/{id}/requeue:
 *   post: { tags: [Notifications - Admin], security: [{ bearerAuth: [] }], summary: Requeue a dead-lettered outbox row, responses: { 200: { description: Outbox row } } }
 */
adminOutboxRouter.get('/', validate({ query: outboxListQuerySchema }), AdminNotificationController.listOutbox);
adminOutboxRouter.post('/:id/requeue', validate({ params: idParamSchema }), AdminNotificationController.requeueOutbox);

export default { adminNotificationsRouter, adminCampaignsRouter, adminOutboxRouter };
