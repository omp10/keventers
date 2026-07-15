import { requireAuth, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';
import { requireGuest, resolveGuest } from '#modules/qr-ordering/index.js';

/**
 * Route guard stacks. Customer order routes are guest-session authenticated;
 * restaurant routes require staff roles (tenant-scoped); admin routes require
 * Super Admin. Order status is never mutated by an unauthenticated caller.
 */
export const customerGuards = [resolveGuest, requireGuest];

export const managementGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER, ORG_ROLES.BRANCH_MANAGER),
];

export const adminGuards = [requireAuth, resolveTenant, requireRole(ORG_ROLES.SUPER_ADMIN)];
