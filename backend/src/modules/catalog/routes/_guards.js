import { requireAuth, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';

/**
 * Shared route guard stacks for the catalog module. Every catalog endpoint is
 * authenticated, tenant-resolved and role-authorized before reaching a
 * controller. Restaurant management is limited to Organization Admins,
 * Restaurant Managers (tenant-scoped) and Super Admins; platform inspection via
 * `/admin/catalog` is Super-Admin only.
 */

/**
 * Restaurant-facing management guard: auth → tenant → manager/admin role.
 *
 * SUPER ADMINS ARE INCLUDED so the platform admin can edit a brand's menu from
 * the kitchen detail page. This is a deliberate cross-tenant grant: a super
 * admin may write to ANY restaurant's catalog. It is not a hole in the tenancy
 * model — `assertRestaurantAccess` already returns early for super admins, and
 * `requireTenant` already admits them; this guard was the only thing excluding
 * them from writes.
 *
 * Isolation for everyone else is unchanged: a super admin has no primary
 * restaurant, so `resolveScope` forces them to name a `restaurantId` explicitly
 * (there is nothing to default to), while managers stay pinned to the
 * restaurants their memberships grant.
 */
export const restaurantGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER, ORG_ROLES.SUPER_ADMIN),
];

/** Platform-admin inspection guard: auth → tenant → super admin. */
export const adminGuards = [
  requireAuth,
  resolveTenant,
  requireRole(ORG_ROLES.SUPER_ADMIN),
];
