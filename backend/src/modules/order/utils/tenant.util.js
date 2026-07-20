import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import {
  assertRestaurantAccess,
  branchService,
  restaurantService,
} from '#modules/organization/index.js';

import { ORDER_ERRORS } from '../constants/order.constants.js';

import { entityId } from './id.util.js';

/**
 * Order tenancy. Two callers:
 *  - CUSTOMER (guest): scope comes ENTIRELY from the signed guest token
 *    (`req.guest`) — org/restaurant/branch/session — never client ids.
 *  - STAFF (restaurant/admin): scope resolved from the authenticated tenant
 *    context via the organization module (access-checked).
 */

/** Build the guest (customer) scope from the verified guest token. */
export function buildGuestScope(guest) {
  if (!guest?.sessionId) throw new ForbiddenError(ORDER_ERRORS.CROSS_TENANT);
  return {
    organizationId: String(guest.organizationId),
    restaurantId: String(guest.restaurantId),
    branchId: String(guest.branchId),
    sessionId: String(guest.sessionId),
    guestId: guest.guestId ? String(guest.guestId) : null,
    tableId: guest.tableId ? String(guest.tableId) : null,
    customerUserId: guest.customerUserId ? String(guest.customerUserId) : null,
  };
}

/** Resolve + access-check a staff scope (restaurant, optional branch). */
export async function resolveStaffScope(tenant, restaurantId, branchId, deps = {}) {
  const restaurants = deps.restaurantService ?? restaurantService;
  const branches = deps.branchService ?? branchService;
  const restaurant = await restaurants.resolveForTenant(tenant, restaurantId);
  const scope = {
    organizationId: String(restaurant.organizationId),
    restaurantId: entityId(restaurant),
    restaurant,
  };
  if (branchId) {
    const branch = await branches.getBranch(tenant, branchId);
    if (!branch || String(branch.restaurantId) !== scope.restaurantId) {
      throw new ForbiddenError(ORDER_ERRORS.CROSS_TENANT);
    }
    scope.branchId = entityId(branch);
  }
  return scope;
}

/** Assert a staff tenant may access an order (reuses the org restaurant rule). */
export function assertStaffAccess(tenant, order) {
  if (!order) throw new ForbiddenError(ORDER_ERRORS.CROSS_TENANT);
  assertRestaurantAccess(tenant, { id: order.restaurantId, organizationId: order.organizationId });
}

/** Assert a guest may access an order (same owning session). */
export function assertGuestAccess(guestScope, order) {
  if (!order || String(order.sessionId) !== guestScope.sessionId) {
    throw new ForbiddenError(ORDER_ERRORS.CROSS_TENANT);
  }
}

/**
 * Ownership for a CUSTOMER caller, who may arrive either way: still at the
 * table (guest session) or signed in from anywhere (account).
 *
 * Matching only the session meant a signed-in customer could list their orders
 * but got 401 opening any one of them — and that particular 401 ("invalid or
 * expired guest session token") makes the client drop the table session, so
 * tapping your own order logged you out.
 *
 * @param {{sessionId?: string|null, userId?: string|null}} access
 */
export function assertCustomerAccess(access, order) {
  if (!order) throw new ForbiddenError(ORDER_ERRORS.CROSS_TENANT);
  const bySession = access.sessionId && String(order.sessionId) === String(access.sessionId);
  const byAccount = access.userId && order.customerUserId && String(order.customerUserId) === String(access.userId);
  if (!bySession && !byAccount) throw new ForbiddenError(ORDER_ERRORS.CROSS_TENANT);
}

/** Load an order for a customer caller (guest session OR signed-in account). */
export async function loadForCustomer(repo, access, id) {
  const order = await repo.findById(id);
  if (!order) throw new NotFoundError(ORDER_ERRORS.ORDER_NOT_FOUND);
  assertCustomerAccess(access, order);
  return order;
}

/** Load an order for a staff caller (404 → then 403 on cross-tenant). */
export async function loadForStaff(repo, tenant, id) {
  const order = await repo.findById(id);
  if (!order) throw new NotFoundError(ORDER_ERRORS.ORDER_NOT_FOUND);
  assertStaffAccess(tenant, order);
  return order;
}

/** Load an order for a guest caller (scoped to their session). */
export async function loadForGuest(repo, guestScope, id) {
  const order = await repo.findById(id);
  if (!order) throw new NotFoundError(ORDER_ERRORS.ORDER_NOT_FOUND);
  assertGuestAccess(guestScope, order);
  return order;
}
