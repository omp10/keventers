import { requireAuth, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';

/**
 * Shared route guard stacks for the catalog module. Every catalog endpoint is
 * authenticated, tenant-resolved and role-authorized before reaching a
 * controller. Restaurant management is limited to Organization Admins and
 * Restaurant Managers (tenant-scoped); platform inspection is Super-Admin only.
 */

/** Restaurant-facing management guard: auth → tenant → manager/admin role. */
export const restaurantGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER),
];

/** Platform-admin inspection guard: auth → tenant → super admin. */
export const adminGuards = [
  requireAuth,
  resolveTenant,
  requireRole(ORG_ROLES.SUPER_ADMIN),
];
