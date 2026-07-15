import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import { assertRestaurantAccess, restaurantService } from '#modules/organization/index.js';

import { CATALOG_ERRORS } from '../constants/catalog.constants.js';

import { entityId } from './id.util.js';

/**
 * Catalog tenancy helpers. The catalog module INHERITS the multi-tenancy model
 * established by the organization module (Membership + tenant context) rather
 * than re-implementing it. Every catalog operation is scoped to a single
 * restaurant resolved from the caller's tenant context — clients never provide
 * raw organization/restaurant identifiers that bypass this check.
 *
 * @typedef {object} CatalogScope
 * @property {string} organizationId
 * @property {string} restaurantId
 * @property {object} restaurant   The resolved (access-checked) restaurant.
 */

/**
 * Resolve the tenant-checked restaurant scope for a request. Delegates to the
 * organization module's RestaurantService, which asserts access and throws
 * NotFound/Forbidden — so a manager can never operate on another restaurant.
 *
 * @param {object} tenant       req.tenant (from resolveTenant middleware).
 * @param {string} [restaurantId] Optional explicit target (super admin / org admin).
 * @returns {Promise<CatalogScope>}
 */
export async function resolveScope(tenant, restaurantId, deps = {}) {
  const restaurants = deps.restaurantService ?? restaurantService;
  const restaurant = await restaurants.resolveForTenant(tenant, restaurantId);
  return {
    organizationId: String(restaurant.organizationId),
    restaurantId: entityId(restaurant),
    restaurant,
  };
}

/**
 * Assert the tenant may access a catalog entity (which always carries
 * organizationId + restaurantId). Reuses the organization module's restaurant
 * access rule so the isolation semantics stay identical platform-wide.
 * Cross-tenant access → 403 Forbidden.
 */
export function assertCatalogAccess(tenant, entity) {
  if (!entity) throw new ForbiddenError(CATALOG_ERRORS.CROSS_TENANT);
  assertRestaurantAccess(tenant, {
    id: entity.restaurantId,
    organizationId: entity.organizationId,
  });
}

/** Build the mandatory tenant filter fragment for a scope. */
export function scopeFilter(scope, extra = {}) {
  return { organizationId: scope.organizationId, restaurantId: scope.restaurantId, ...extra };
}

/**
 * Load an entity by id and assert the tenant owns it. Not-found → 404;
 * cross-tenant → 403 (never leaks another restaurant's data). Used by every
 * by-id service operation so isolation is enforced uniformly.
 *
 * @param {{ findById: (id: string) => Promise<any> }} repo
 * @param {object} tenant
 * @param {string} id
 * @param {string} notFoundMessage
 */
export async function loadOwned(repo, tenant, id, notFoundMessage) {
  const entity = await repo.findById(id);
  if (!entity) throw new NotFoundError(notFoundMessage);
  assertCatalogAccess(tenant, entity);
  return entity;
}
