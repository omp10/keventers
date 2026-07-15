import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import { assertRestaurantAccess, restaurantService } from '#modules/organization/index.js';

import { PRICING_ERRORS } from '../constants/pricing.constants.js';

/**
 * Tenancy helpers for coupon management. Coupons are restaurant-scoped and
 * inherit the organization module's multi-tenancy — the scope is resolved from
 * the authenticated tenant context, never from client-supplied ids.
 */
export async function resolveScope(tenant, restaurantId, deps = {}) {
  const restaurants = deps.restaurantService ?? restaurantService;
  const restaurant = await restaurants.resolveForTenant(tenant, restaurantId);
  return {
    organizationId: String(restaurant.organizationId),
    restaurantId: restaurant.id ?? String(restaurant._id),
    restaurant,
  };
}

export function assertCouponAccess(tenant, coupon) {
  if (!coupon) throw new ForbiddenError(PRICING_ERRORS.CROSS_TENANT);
  assertRestaurantAccess(tenant, { id: coupon.restaurantId, organizationId: coupon.organizationId });
}

export async function loadOwned(repo, tenant, id, notFoundMessage) {
  const coupon = await repo.findById(id);
  if (!coupon) throw new NotFoundError(notFoundMessage);
  assertCouponAccess(tenant, coupon);
  return coupon;
}
