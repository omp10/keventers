import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import {
  assertRestaurantAccess,
  restaurantService,
} from '#modules/organization/index.js';

import { CUSTOMER_ERRORS } from '../constants/customer.constants.js';

import { entityId } from './id.util.js';

/**
 * Customer tenancy. Customer-facing endpoints derive scope ENTIRELY from the
 * signed guest token (`req.guest`) — and REQUIRE a linked identity (the guest
 * has signed in), so `customerUserId` is present. Staff/admin endpoints resolve
 * scope from the authenticated tenant context via the organization module.
 * Client-supplied ids are never trusted.
 */

/**
 * Build a customer scope from a guest principal. Throws if the guest has not yet
 * linked an account (loyalty/profile require a registered customer).
 * @param {object} guest req.guest
 */
export function buildCustomerScope(guest) {
  if (!guest?.sessionId) throw new ForbiddenError(CUSTOMER_ERRORS.CROSS_TENANT);
  if (!guest.customerUserId) throw new ForbiddenError(CUSTOMER_ERRORS.NOT_LINKED);
  return {
    organizationId: String(guest.organizationId),
    restaurantId: String(guest.restaurantId),
    branchId: guest.branchId ? String(guest.branchId) : null,
    sessionId: String(guest.sessionId),
    userId: String(guest.customerUserId),
  };
}

/** Resolve an org+restaurant scope for staff/admin (no branch). */
export async function resolveRestaurantScope(tenant, restaurantId, deps = {}) {
  const restaurants = deps.restaurantService ?? restaurantService;
  const restaurant = await restaurants.resolveForTenant(tenant, restaurantId);
  return { organizationId: String(restaurant.organizationId), restaurantId: entityId(restaurant), restaurant };
}

export function assertStaffAccess(tenant, entity) {
  if (!entity) throw new ForbiddenError(CUSTOMER_ERRORS.CROSS_TENANT);
  assertRestaurantAccess(tenant, { id: entity.restaurantId, organizationId: entity.organizationId });
}

/** Load an owned entity for staff, enforcing tenant isolation (404 → 403). */
export async function loadForStaff(repo, tenant, id, notFoundMessage) {
  const entity = await repo.findById(id);
  if (!entity) throw new NotFoundError(notFoundMessage);
  assertStaffAccess(tenant, entity);
  return entity;
}
