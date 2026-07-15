import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import { assertRestaurantAccess, branchService, restaurantService } from '#modules/organization/index.js';

import { QR_ERRORS } from '../constants/qr.constants.js';

import { entityId } from './id.util.js';

/**
 * Tenancy helpers for the QR Ordering module. Tables, QR codes and sessions are
 * BRANCH-scoped (organization + restaurant + branch). The module INHERITS the
 * organization module's multi-tenancy — it never trusts client-supplied tenant
 * ids, resolving everything from the authenticated tenant context.
 *
 * @typedef {object} BranchScope
 * @property {string} organizationId
 * @property {string} restaurantId
 * @property {string} [branchId]
 * @property {object} restaurant
 * @property {object} [branch]
 */

/**
 * Resolve a tenant-checked scope. The restaurant is resolved (and access-checked)
 * via the organization module; when a branchId is supplied it is loaded,
 * access-checked, and verified to belong to that restaurant.
 *
 * @param {object} tenant       req.tenant
 * @param {string} [restaurantId]
 * @param {string} [branchId]
 * @returns {Promise<BranchScope>}
 */
export async function resolveScope(tenant, restaurantId, branchId, deps = {}) {
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
    if (!branch) throw new NotFoundError(QR_ERRORS.BRANCH_UNAVAILABLE);
    if (String(branch.restaurantId) !== scope.restaurantId) {
      throw new ForbiddenError(QR_ERRORS.CROSS_TENANT);
    }
    scope.branchId = entityId(branch);
    scope.branch = branch;
  }

  return scope;
}

/** Require a branch in the scope (branch-scoped write operations). */
export function requireBranch(scope) {
  if (!scope?.branchId) throw new ForbiddenError(QR_ERRORS.BRANCH_UNAVAILABLE);
  return scope.branchId;
}

/**
 * Assert the tenant may access an entity (which carries organizationId +
 * restaurantId). Reuses the organization module's restaurant access rule so the
 * isolation semantics are identical platform-wide. Cross-tenant → 403.
 */
export function assertQrAccess(tenant, entity) {
  if (!entity) throw new ForbiddenError(QR_ERRORS.CROSS_TENANT);
  assertRestaurantAccess(tenant, {
    id: entity.restaurantId,
    organizationId: entity.organizationId,
  });
}

/**
 * Load an entity by id and assert the tenant owns it. Missing → 404;
 * cross-tenant → 403 (another branch's data is never exposed).
 */
export async function loadOwned(repo, tenant, id, notFoundMessage) {
  const entity = await repo.findById(id);
  if (!entity) throw new NotFoundError(notFoundMessage);
  assertQrAccess(tenant, entity);
  return entity;
}
