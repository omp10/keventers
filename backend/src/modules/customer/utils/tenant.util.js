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

/**
 * Build a customer scope from a signed-in account, with NO guest session.
 *
 * Someone opening their profile at home is a first-class case: they are properly
 * authenticated, they are just not sitting at a table. There is no guest token to
 * name a restaurant, so we scope to the customer record they used most recently.
 *
 * Returns `null` when the account has no customer record at all (signed up, never
 * ordered). That is NOT an error — it means "nothing to show yet", and callers
 * render an empty state rather than failing. Their identity still comes from the
 * identity module, which needs no restaurant.
 *
 * @param {string} userId authenticated principal id
 * @param {object} customers customer repository
 */
export async function buildAccountCustomerScope(userId, customers) {
  const records = await customers.findAllForUser(userId);
  const latest = records[0];
  if (!latest) return null;
  return {
    organizationId: String(latest.organizationId),
    restaurantId: String(latest.restaurantId),
    branchId: null,
    // No table session — anything that genuinely needs one must say so, rather
    // than silently accepting an id that points at nothing.
    sessionId: null,
    userId: String(userId),
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
