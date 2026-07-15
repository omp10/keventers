import { BaseRepository } from '#core/repository/base.repository.js';

/**
 * Tenant-scoped repository base for the QR Ordering module. Extends the platform
 * BaseRepository (still the ONLY MongoDB access layer) and layers mandatory
 * organization + restaurant (+ optional branch) scoping onto every query, so a
 * caller can never read or mutate another branch's tables/QR/sessions. Services
 * pass a resolved `{ organizationId, restaurantId, branchId? }` scope; a lookup
 * outside the scope returns null → the service raises NotFound/Forbidden.
 *
 * @template T
 */
export class BranchScopedRepository extends BaseRepository {
  /** Inject org + restaurant (+ branch when present) into a filter. */
  scoped(scope, filter = {}) {
    const base = {
      ...filter,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
    };
    if (scope.branchId) base.branchId = scope.branchId;
    return base;
  }

  createScoped(scope, data, options = {}) {
    const stamped = {
      ...data,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
    };
    if (scope.branchId) stamped.branchId = scope.branchId;
    return this.create(stamped, options);
  }

  findScoped(scope, filter = {}, options = {}) {
    return this.find(this.scoped(scope, filter), options);
  }

  findOneScoped(scope, filter = {}, options = {}) {
    return this.findOne(this.scoped(scope, filter), options);
  }

  findByIdScoped(scope, id, options = {}) {
    return this.findOne(this.scoped(scope, { _id: id }), options);
  }

  paginateScoped(scope, params = {}, options = {}) {
    // The trusted tenant scope must survive buildFilter (which drops any field
    // not in allowedFilterFields) — otherwise the listing leaks across tenants.
    const allowedFilterFields = params.allowedFilterFields
      ? [...new Set([...params.allowedFilterFields, 'organizationId', 'restaurantId', 'branchId'])]
      : params.allowedFilterFields;
    return this.paginate(
      { ...params, filter: this.scoped(scope, params.filter ?? {}), allowedFilterFields },
      options,
    );
  }

  countScoped(scope, filter = {}, options = {}) {
    return this.count(this.scoped(scope, filter), options);
  }

  existsScoped(scope, filter = {}, options = {}) {
    return this.exists(this.scoped(scope, filter), options);
  }
}

export default BranchScopedRepository;
