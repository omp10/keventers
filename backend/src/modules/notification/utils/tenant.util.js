import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import {
  assertRestaurantAccess,
  restaurantService,
} from '#modules/organization/index.js';

import { NOTIFICATION_ERRORS } from '../constants/notification.constants.js';

import { entityId } from './id.util.js';

/**
 * Notification tenancy. Customer-facing endpoints derive scope + recipient from
 * the signed guest token (`req.guest`). Staff/admin endpoints resolve scope from
 * the authenticated tenant context. Client ids are never trusted.
 */

/** Recipient scope for a guest (linked customer OR anonymous session). */
export function buildRecipientScope(guest) {
  if (!guest?.sessionId) throw new ForbiddenError(NOTIFICATION_ERRORS.CROSS_TENANT);
  return {
    organizationId: String(guest.organizationId),
    restaurantId: String(guest.restaurantId),
    branchId: guest.branchId ? String(guest.branchId) : null,
    sessionId: String(guest.sessionId),
    userId: guest.customerUserId ? String(guest.customerUserId) : null,
  };
}

export async function resolveRestaurantScope(tenant, restaurantId, deps = {}) {
  const restaurants = deps.restaurantService ?? restaurantService;
  const restaurant = await restaurants.resolveForTenant(tenant, restaurantId);
  return { organizationId: String(restaurant.organizationId), restaurantId: entityId(restaurant), restaurant };
}

export function assertStaffAccess(tenant, entity) {
  if (!entity) throw new ForbiddenError(NOTIFICATION_ERRORS.CROSS_TENANT);
  assertRestaurantAccess(tenant, { id: entity.restaurantId, organizationId: entity.organizationId });
}

export async function loadForStaff(repo, tenant, id, notFoundMessage) {
  const entity = await repo.findById(id);
  if (!entity) throw new NotFoundError(notFoundMessage);
  assertStaffAccess(tenant, entity);
  return entity;
}
