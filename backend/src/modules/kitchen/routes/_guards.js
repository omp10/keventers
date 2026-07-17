import { requireAuth, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';

/**
 * Route guard stacks. Kitchen management is limited to Organization Admins,
 * Restaurant Managers and Branch Managers (their own restaurant/branch, enforced
 * by tenant scoping); platform inspection is Super-Admin only. A kitchen station
 * runs under a manager account — chefs act through the manager/branch console.
 */
export const managementGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER, ORG_ROLES.BRANCH_MANAGER),
];

export const adminGuards = [requireAuth, resolveTenant, requireRole(ORG_ROLES.SUPER_ADMIN)];

/**
 * Floor staff (waiters/runners/chefs on their own phones). They reach ONLY the
 * "my work" endpoints — the service further restricts every read/transition to
 * orders assigned to the authenticated user, so the role gate here is the outer
 * fence, not the whole protection.
 */
export const staffGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(
    ORG_ROLES.STAFF,
    ORG_ROLES.BRANCH_MANAGER,
    ORG_ROLES.RESTAURANT_MANAGER,
    ORG_ROLES.ORGANIZATION_ADMIN,
  ),
];
