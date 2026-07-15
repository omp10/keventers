import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { RestaurantNotificationController } from '../controllers/restaurant-notification.controller.js';
import {
  campaignListQuerySchema,
  createCampaignSchema,
  createTemplateSchema,
  idParamSchema,
  notificationListQuerySchema,
  templateListQuerySchema,
  testSendSchema,
  updateCampaignSchema,
  updateTemplateSchema,
} from '../validators/notification.validators.js';

import { managementGuards, requireCampaignManage, requireNotificationSend, requireTemplateManage } from './_guards.js';

/**
 * Restaurant staff routers: delivery history + manual send, template catalog and
 * campaigns. Mounted under specific `/restaurant/*` paths so they compose with
 * the organization module.
 */
export const notificationsRouter = Router();
notificationsRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/notifications:
 *   get: { tags: [Notifications - Restaurant], security: [{ bearerAuth: [] }], summary: Delivery history, responses: { 200: { description: Notifications } } }
 * /api/v1/restaurant/notifications/test:
 *   post: { tags: [Notifications - Restaurant], security: [{ bearerAuth: [] }], summary: Send a test notification, responses: { 201: { description: Notification } } }
 */
notificationsRouter.get('/', validate({ query: notificationListQuerySchema }), RestaurantNotificationController.list);
notificationsRouter.post('/test', validate({ body: testSendSchema }), requireNotificationSend, RestaurantNotificationController.test);
notificationsRouter.get('/:id', validate({ params: idParamSchema }), RestaurantNotificationController.get);

export const templatesRouter = Router();
templatesRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/notification-templates:
 *   get: { tags: [Notifications - Restaurant], security: [{ bearerAuth: [] }], summary: List templates, responses: { 200: { description: Templates } } }
 *   post: { tags: [Notifications - Restaurant], security: [{ bearerAuth: [] }], summary: Create a template, responses: { 201: { description: Template } } }
 */
templatesRouter.get('/', validate({ query: templateListQuerySchema }), RestaurantNotificationController.listTemplates);
templatesRouter.post('/', validate({ body: createTemplateSchema }), requireTemplateManage, RestaurantNotificationController.createTemplate);
templatesRouter.patch('/:id', validate({ params: idParamSchema, body: updateTemplateSchema }), requireTemplateManage, RestaurantNotificationController.updateTemplate);
templatesRouter.delete('/:id', validate({ params: idParamSchema }), requireTemplateManage, RestaurantNotificationController.deleteTemplate);

export const campaignsRouter = Router();
campaignsRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/notification-campaigns:
 *   get: { tags: [Notifications - Restaurant], security: [{ bearerAuth: [] }], summary: List campaigns, responses: { 200: { description: Campaigns } } }
 *   post: { tags: [Notifications - Restaurant], security: [{ bearerAuth: [] }], summary: Create a campaign, responses: { 201: { description: Campaign } } }
 */
campaignsRouter.get('/', validate({ query: campaignListQuerySchema }), RestaurantNotificationController.listCampaigns);
campaignsRouter.post('/', validate({ body: createCampaignSchema }), requireCampaignManage, RestaurantNotificationController.createCampaign);
campaignsRouter.patch('/:id', validate({ params: idParamSchema, body: updateCampaignSchema }), requireCampaignManage, RestaurantNotificationController.updateCampaign);
campaignsRouter.delete('/:id', validate({ params: idParamSchema }), requireCampaignManage, RestaurantNotificationController.cancelCampaign);

export default { notificationsRouter, templatesRouter, campaignsRouter };
