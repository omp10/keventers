import { ForbiddenError } from '#core/errors/app-error.js';

import { CART_ERRORS } from '../constants/cart.constants.js';

/**
 * Cart tenancy is derived ENTIRELY from the guest session's signed token
 * (`req.guest`), never from client-provided ids. The token is cryptographically
 * bound to one organization/restaurant/branch/table/session at scan time, so it
 * is the trusted source of the cart's ownership + scope.
 *
 * @param {object} guest  req.guest (from the QR module's requireGuest middleware).
 * @returns {{ organizationId, restaurantId, branchId, sessionId, guestId, tableId, customerUserId }}
 */
export function buildGuestScope(guest) {
  if (!guest?.sessionId) throw new ForbiddenError(CART_ERRORS.SESSION_INVALID);
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

/** Defensive assertion that a loaded cart belongs to the requesting session. */
export function assertCartAccess(scope, cart) {
  if (!cart) throw new ForbiddenError(CART_ERRORS.CROSS_TENANT);
  if (
    String(cart.sessionId) !== scope.sessionId ||
    String(cart.restaurantId) !== scope.restaurantId ||
    String(cart.branchId) !== scope.branchId
  ) {
    throw new ForbiddenError(CART_ERRORS.CROSS_TENANT);
  }
}
