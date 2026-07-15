import { requireAuth, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';
import { requireGuest, resolveGuest } from '#modules/qr-ordering/index.js';

/**
 * Route guard stacks. Customer payment endpoints are guest-session authenticated;
 * restaurant financial endpoints require staff roles (tenant-scoped); admin
 * endpoints require Super Admin. Webhooks are UNAUTHENTICATED — their security is
 * cryptographic signature verification inside the webhook service.
 */
export const customerGuards = [resolveGuest, requireGuest];

export const managementGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER, ORG_ROLES.BRANCH_MANAGER),
];

export const adminGuards = [requireAuth, resolveTenant, requireRole(ORG_ROLES.SUPER_ADMIN)];
