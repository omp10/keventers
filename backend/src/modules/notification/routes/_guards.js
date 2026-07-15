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
