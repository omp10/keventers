import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { CustomerNotificationController } from '../controllers/customer-notification.controller.js';
import { idParamSchema, inboxQuerySchema, updatePreferencesSchema } from '../validators/notification.validators.js';

import { customerGuards } from './_guards.js';

const router = Router();

router.use(...customerGuards);

/**
 * @openapi
 * /api/v1/notifications:
 *   get: { tags: [Notifications], security: [{ bearerAuth: [] }], summary: My in-app notifications (with unread count), responses: { 200: { description: Inbox } } }
 * /api/v1/notifications/read-all:
 *   post: { tags: [Notifications], security: [{ bearerAuth: [] }], summary: Mark all my notifications read, responses: { 200: { description: Count } } }
 * /api/v1/notifications/{id}/read:
 *   patch: { tags: [Notifications], security: [{ bearerAuth: [] }], summary: Mark one notification read, responses: { 200: { description: Notification } } }
 * /api/v1/notifications/preferences:
 *   get: { tags: [Notifications], security: [{ bearerAuth: [] }], summary: My notification preferences, responses: { 200: { description: Preferences } } }
 *   patch: { tags: [Notifications], security: [{ bearerAuth: [] }], summary: Update my notification preferences (per category/channel), responses: { 200: { description: Preferences } } }
 */
router.get('/', validate({ query: inboxQuerySchema }), CustomerNotificationController.list);
router.post('/read-all', CustomerNotificationController.markAllRead);
router.get('/preferences', CustomerNotificationController.getPreferences);
router.patch('/preferences', validate({ body: updatePreferencesSchema }), CustomerNotificationController.updatePreferences);
router.patch('/:id/read', validate({ params: idParamSchema }), CustomerNotificationController.markRead);

export default router;
