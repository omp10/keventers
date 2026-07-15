import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import {
  assertRestaurantAccess,
  branchService,
  restaurantService,
} from '#modules/organization/index.js';

import { KITCHEN_ERRORS } from '../constants/kitchen.constants.js';

import { entityId } from './id.util.js';

/**
 * Kitchen tenancy. Kitchen queues + stations are BRANCH-scoped (organization +
 * restaurant + branch). Staff scope is resolved from the authenticated tenant
 * context via the organization module — client-supplied ids are never trusted.
 */
export async function resolveBranchScope(tenant, restaurantId, branchId, deps = {}) {
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
      throw new ForbiddenError(KITCHEN_ERRORS.CROSS_TENANT);
    }
    scope.branchId = entityId(branch);
    scope.branch = branch;
  }
  return scope;
}

/** Assert a tenant may access a kitchen entity (reuses the org restaurant rule). */
export function assertKitchenAccess(tenant, entity) {
  if (!entity) throw new ForbiddenError(KITCHEN_ERRORS.CROSS_TENANT);
  assertRestaurantAccess(tenant, { id: entity.restaurantId, organizationId: entity.organizationId });
}

/** Load an entity by id and assert tenant ownership (404 then 403). */
export async function loadOwned(repo, tenant, id, notFoundMessage) {
  const entity = await repo.findById(id);
  if (!entity) throw new NotFoundError(notFoundMessage);
  assertKitchenAccess(tenant, entity);
  return entity;
}
