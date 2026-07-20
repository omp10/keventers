import { UnauthorizedError } from '#core/errors/app-error.js';
import { requireAuth, requirePermission, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';
import { requireGuest, resolveGuest } from '#modules/qr-ordering/index.js';

import { NOTIFICATION_PERMISSIONS } from '../constants/notification.constants.js';

/**
 * Route guard stacks. Customer notification endpoints are guest-session
 * authenticated. Restaurant endpoints require staff roles + tenant scope, with
 * fine-grained permissions on sensitive sends/template/campaign mutations. Admin
 * endpoints require the Super Admin.
 */
export const customerGuards = [resolveGuest, requireGuest];

/**
 * Inbox + preferences: a table guest OR any signed-in account.
 *
 * These sat behind the STRICT guest guard, so the bell answered 401 to every
 * signed-in customer AND to staff — whose only credential is an account —
 * leaving the notification centre permanently empty in the staff and dashboard
 * shells. Worse, that particular 401 tells the client the guest session is dead,
 * so a customer's table session got wiped by opening their notifications.
 * The inbox is keyed by userId when present, else sessionId, so either
 * identity is sufficient; `resolveTenant` follows for preferences, which need
 * the org/restaurant an account alone does not carry.
 */
export const recipientGuards = [
  resolveGuest,
  (req, _res, next) => {
    if (req.guest?.sessionId || req.principal?.authenticated) return next();
    return next(new UnauthorizedError());
  },
  resolveTenant,
];

export const managementGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER, ORG_ROLES.BRANCH_MANAGER),
];

export const adminGuards = [requireAuth, resolveTenant, requireRole(ORG_ROLES.SUPER_ADMIN)];

export const requireNotificationSend = requirePermission(NOTIFICATION_PERMISSIONS.NOTIFICATION_SEND);
export const requireTemplateManage = requirePermission(NOTIFICATION_PERMISSIONS.TEMPLATE_MANAGE);
export const requireCampaignManage = requirePermission(NOTIFICATION_PERMISSIONS.CAMPAIGN_MANAGE);
