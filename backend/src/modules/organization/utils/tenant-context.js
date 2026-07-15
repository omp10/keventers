import { ForbiddenError } from '#core/errors/app-error.js';

import { ORG_ERRORS, ORG_ROLES } from '../constants/organization.constants.js';

/**
 * Tenant context helpers. A tenant context is derived from the authenticated
 * principal's memberships (see tenant.middleware) and is the single source of
 * truth for what a request may access. Services use these assertions to
 * guarantee no cross-tenant data access.
 *
 * @typedef {object} TenantContext
 * @property {boolean} isSuperAdmin
 * @property {string|null} userId
 * @property {string[]} organizationIds
 * @property {string[]} restaurantIds
 * @property {string[]} branchIds
 * @property {string|null} primaryOrganizationId
 * @property {string|null} primaryRestaurantId
 */

export function buildTenantContext({ principal, memberships = [] }) {
  const isSuperAdmin = (principal?.roles ?? []).includes(ORG_ROLES.SUPER_ADMIN);
  const organizationIds = [...new Set(memberships.map((m) => String(m.organizationId)))];
  const restaurantIds = [
    ...new Set(memberships.map((m) => (m.restaurantId ? String(m.restaurantId) : null)).filter(Boolean)),
  ];
  const branchIds = [
    ...new Set(memberships.map((m) => (m.branchId ? String(m.branchId) : null)).filter(Boolean)),
  ];
  const owner = memberships.find((m) => m.isOwner) ?? memberships[0] ?? null;

  return {
    isSuperAdmin,
    userId: principal?.id ?? null,
    roles: principal?.roles ?? [],
    organizationIds,
    restaurantIds,
    branchIds,
    primaryOrganizationId: owner ? String(owner.organizationId) : null,
    primaryRestaurantId: owner?.restaurantId ? String(owner.restaurantId) : restaurantIds[0] ?? null,
    memberships,
  };
}

/** Throw unless the tenant may access the given organization. */
export function assertOrganizationAccess(tenant, organizationId) {
  if (tenant?.isSuperAdmin) return;
  if (!organizationId || !tenant?.organizationIds?.includes(String(organizationId))) {
    throw new ForbiddenError(ORG_ERRORS.CROSS_TENANT);
  }
}

/** Throw unless the tenant may access the given restaurant. */
export function assertRestaurantAccess(tenant, restaurant) {
  if (tenant?.isSuperAdmin) return;
  const orgId = String(restaurant?.organizationId ?? '');
  const restId = String(restaurant?.id ?? restaurant?._id ?? '');
  const orgOk = tenant?.organizationIds?.includes(orgId);
  // Org admins reach every restaurant in their org; managers only assigned ones.
  const restOk = tenant?.restaurantIds?.length === 0 || tenant?.restaurantIds?.includes(restId);
  if (!orgOk || !restOk) throw new ForbiddenError(ORG_ERRORS.CROSS_TENANT);
}

/** Resolve the organization id the request operates on (single-tenant users). */
export function requirePrimaryOrganization(tenant) {
  if (tenant?.isSuperAdmin) return null; // super admin must pass an explicit id
  if (!tenant?.primaryOrganizationId) throw new ForbiddenError(ORG_ERRORS.NO_TENANT);
  return tenant.primaryOrganizationId;
}
