import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth } from '#platform/auth/index.js';
import { resolveTenant } from '#modules/organization/index.js';

import { CustomerNotificationController } from '../controllers/customer-notification.controller.js';
import { fcmTokenSchema } from '../validators/notification.validators.js';

/**
 * FCM token registration, mounted once per APP so each client posts to a path
 * that names it:
 *
 *   POST /api/v1/customer/fcm-token   (the diner's PWA)
 *   POST /api/v1/staff/fcm-token      (floor staff)
 *   POST /api/v1/kitchen/fcm-token    (the kitchen display)
 *
 * They share one handler deliberately. Identity is global in this platform — a
 * chef, a waiter and a diner are all the same principal type — so the only thing
 * that legitimately differs per app is the guard, and today all three require a
 * signed-in account. Splitting the logic would give three copies to keep in step
 * and no behavioural difference. `resolveTenant` is optional-by-nature here: a
 * customer with no staff membership still resolves, and the token is stored on
 * the user either way.
 *
 * @openapi
 * /api/v1/customer/fcm-token:
 *   post:
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     summary: Register this device's FCM token (customer app)
 *     description: Body `{ token, platform }`. `platform` is normalised onto web/mobile, so "android" and "ios" both file under mobile.
 *     responses: { 201: { description: Registered }, 400: { description: Missing/short token }, 401: { description: Not signed in } }
 * /api/v1/staff/fcm-token:
 *   post: { tags: [Notifications], security: [{ bearerAuth: [] }], summary: Register this device's FCM token (staff app), responses: { 201: { description: Registered } } }
 * /api/v1/kitchen/fcm-token:
 *   post: { tags: [Notifications], security: [{ bearerAuth: [] }], summary: Register this device's FCM token (kitchen app), responses: { 201: { description: Registered } } }
 */
export function buildFcmTokenRouter() {
  const router = Router();
  router.post(
    '/',
    requireAuth,
    resolveTenant,
    validate({ body: fcmTokenSchema }),
    CustomerNotificationController.registerFcmToken,
  );
  return router;
}

export default buildFcmTokenRouter;
