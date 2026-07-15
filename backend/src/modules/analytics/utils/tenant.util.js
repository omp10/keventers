import { ForbiddenError } from '#core/errors/app-error.js';
import {
  assertRestaurantAccess,
  restaurantService,
} from '#modules/organization/index.js';

import { ANALYTICS_ERRORS } from '../constants/analytics.constants.js';

import { entityId } from './id.util.js';

/**
 * Analytics tenancy. All dashboard endpoints are staff/admin — scope is resolved
 * from the authenticated tenant context; client ids are never trusted. Analytics
 * is never exposed across tenants.
 */
export async function resolveRestaurantScope(tenant, restaurantId, deps = {}) {
  const restaurants = deps.restaurantService ?? restaurantService;
  const restaurant = await restaurants.resolveForTenant(tenant, restaurantId);
  return { organizationId: String(restaurant.organizationId), restaurantId: entityId(restaurant), restaurant };
}

export function assertScopeAccess(tenant, scope) {
  if (!scope) throw new ForbiddenError(ANALYTICS_ERRORS.CROSS_TENANT);
  assertRestaurantAccess(tenant, { id: scope.restaurantId, organizationId: scope.organizationId });
}
