import { requireAuth, requirePermission, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';

import { ANALYTICS_PERMISSIONS } from '../constants/analytics.constants.js';

/**
 * Analytics is staff/admin-only. Restaurant dashboards require a management role +
 * `analytics:read`; exports need `analytics:export`; rebuilds need
 * `analytics:rebuild`. Platform analytics require the Super Admin.
 */
export const managementGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER, ORG_ROLES.BRANCH_MANAGER, ORG_ROLES.SUPER_ADMIN),
  requirePermission(ANALYTICS_PERMISSIONS.ANALYTICS_READ),
];

export const adminGuards = [requireAuth, resolveTenant, requireRole(ORG_ROLES.SUPER_ADMIN)];

export const requireExport = requirePermission(ANALYTICS_PERMISSIONS.ANALYTICS_EXPORT);
export const requireRebuild = requirePermission(ANALYTICS_PERMISSIONS.ANALYTICS_REBUILD);
