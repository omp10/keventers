import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import {
  assertRestaurantAccess,
  branchService,
  restaurantService,
} from '#modules/organization/index.js';

import { PAYMENT_ERRORS } from '../constants/payment.constants.js';

import { entityId } from './id.util.js';

/**
 * Payment tenancy. Customer payment endpoints derive scope ENTIRELY from the
 * signed guest token (`req.guest`); staff/admin endpoints resolve scope from the
 * authenticated tenant context via the organization module. Client-supplied ids
 * are never trusted.
 */
export function buildGuestScope(guest) {
  if (!guest?.sessionId) throw new ForbiddenError(PAYMENT_ERRORS.CROSS_TENANT);
  return {
    organizationId: String(guest.organizationId),
    restaurantId: String(guest.restaurantId),
    branchId: String(guest.branchId),
    sessionId: String(guest.sessionId),
    customerUserId: guest.customerUserId ? String(guest.customerUserId) : null,
  };
}

/** Resolve an org+restaurant scope (for provider config, which has no branch). */
export async function resolveRestaurantScope(tenant, restaurantId, deps = {}) {
  const restaurants = deps.restaurantService ?? restaurantService;
  const restaurant = await restaurants.resolveForTenant(tenant, restaurantId);
  return { organizationId: String(restaurant.organizationId), restaurantId: entityId(restaurant), restaurant };
}

/** Resolve a full staff scope (restaurant, optional branch). */
export async function resolveStaffScope(tenant, restaurantId, branchId, deps = {}) {
  const scope = await resolveRestaurantScope(tenant, restaurantId, deps);
  if (branchId) {
    const branches = deps.branchService ?? branchService;
    const branch = await branches.getBranch(tenant, branchId);
    if (!branch || String(branch.restaurantId) !== scope.restaurantId) {
      throw new ForbiddenError(PAYMENT_ERRORS.CROSS_TENANT);
    }
    scope.branchId = entityId(branch);
  }
  return scope;
}

export function assertStaffAccess(tenant, entity) {
  if (!entity) throw new ForbiddenError(PAYMENT_ERRORS.CROSS_TENANT);
  assertRestaurantAccess(tenant, { id: entity.restaurantId, organizationId: entity.organizationId });
}

export function assertGuestAccess(guestScope, entity) {
  if (!entity || String(entity.sessionId ?? '') !== guestScope.sessionId) {
    throw new ForbiddenError(PAYMENT_ERRORS.CROSS_TENANT);
  }
}

export async function loadForStaff(repo, tenant, id, notFoundMessage) {
  const entity = await repo.findById(id);
  if (!entity) throw new NotFoundError(notFoundMessage);
  assertStaffAccess(tenant, entity);
  return entity;
}
