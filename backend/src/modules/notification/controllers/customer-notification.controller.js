import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';
import { ForbiddenError } from '#core/errors/app-error.js';

import { NOTIFICATION_ERRORS } from '../constants/notification.constants.js';
import { notificationService } from '../services/notification.service.js';
import { preferenceService } from '../services/preference.service.js';

import { queryOf, recipientScopeOf } from './_helpers.js';

/**
 * Customer notification endpoints — guest-session authenticated. The in-app inbox
 * is scoped to the recipient (linked userId, else the anonymous sessionId).
 * Preferences require a linked account (userId).
 */
export const CustomerNotificationController = {
  /** GET /api/v1/notifications */
  list: asyncHandler(async (req, res) => {
    const data = await notificationService.listInbox(recipientScopeOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),

  /** PATCH /api/v1/notifications/:id/read */
  markRead: asyncHandler(async (req, res) => {
    const data = await notificationService.markRead(recipientScopeOf(req), req.params.id);
    ApiResponse.success(res, { data });
  }),

  /** POST /api/v1/notifications/read-all */
  markAllRead: asyncHandler(async (req, res) => {
    const data = await notificationService.markAllRead(recipientScopeOf(req));
    ApiResponse.success(res, { data });
  }),

  /** GET /api/v1/notifications/preferences */
  getPreferences: asyncHandler(async (req, res) => {
    const scope = recipientScopeOf(req);
    const data = await preferenceService.getPreferencesDTO({ organizationId: scope.organizationId, restaurantId: scope.restaurantId }, requireUser(scope));
    ApiResponse.success(res, { data });
  }),

  /** PATCH /api/v1/notifications/preferences */
  updatePreferences: asyncHandler(async (req, res) => {
    const scope = recipientScopeOf(req);
    const data = await preferenceService.updatePreferences({ organizationId: scope.organizationId, restaurantId: scope.restaurantId }, requireUser(scope), req.body);
    ApiResponse.success(res, { data });
  }),

  /**
   * POST /api/v1/notifications/devices — register this device's FCM token.
   *
   * Auth-guarded (account principal), NOT guest-session: a device token belongs
   * to a USER (staff or signed-in customer) and push targets the user, so this
   * must work for anyone signed in, including staff whose phone should ring on a
   * new order even with the app closed.
   */
  registerDevice: asyncHandler(async (req, res) => {
    const scope = deviceScopeOf(req);
    const data = await preferenceService.registerDevice(scope, req.principal.id, req.body.token);
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  /** DELETE /api/v1/notifications/devices — drop this device's FCM token. */
  unregisterDevice: asyncHandler(async (req, res) => {
    const scope = deviceScopeOf(req);
    await preferenceService.unregisterDevice(scope, req.principal.id, req.body.token);
    ApiResponse.success(res, { data: { ok: true } });
  }),
};

/** Device tokens live on the user's preference for their primary restaurant. */
function deviceScopeOf(req) {
  const t = req.tenant ?? {};
  return {
    organizationId: t.primaryOrganizationId ?? t.organizationIds?.[0] ?? null,
    restaurantId: t.primaryRestaurantId ?? t.restaurantIds?.[0] ?? null,
  };
}

/** Preferences are per registered user — reject anonymous guests. */
function requireUser(scope) {
  if (!scope.userId) throw new ForbiddenError(NOTIFICATION_ERRORS.NOT_LINKED);
  return scope.userId;
}

export default CustomerNotificationController;
