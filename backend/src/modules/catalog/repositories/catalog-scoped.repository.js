import { BaseRepository } from '#core/repository/base.repository.js';

/**
 * Tenant-scoped repository base for the catalog module. Extends the platform
 * BaseRepository (still the ONLY MongoDB access layer) and layers mandatory
 * organization+restaurant scoping onto every query so a caller can never read
 * or mutate another restaurant's catalog. Services pass a resolved
 * `{ organizationId, restaurantId }` scope (see catalog-tenant.util) to the
 * `*Scoped` methods; a lookup outside the scope returns null → the service
 * raises NotFound/Forbidden.
 *
 * @template T
 */
export class CatalogScopedRepository extends BaseRepository {
  /** Inject the tenant scope into a filter. */
  scoped(scope, filter = {}) {
    return {
      ...filter,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
    };
  }

  createScoped(scope, data, options = {}) {
    return this.create(
      { ...data, organizationId: scope.organizationId, restaurantId: scope.restaurantId },
      options,
    );
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
      ? [...new Set([...params.allowedFilterFields, 'organizationId', 'restaurantId'])]
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

  /** Bulk update within the scope (returns the raw driver result). */
  updateManyScoped(scope, filter, patch, options = {}) {
    return this.model.updateMany(
      this.scoped(scope, this.#notDeleted(filter)),
      { $set: patch },
      options.session ? { session: options.session } : {},
    );
  }

  #notDeleted(filter = {}) {
    if (!this.softDelete) return filter;
    return { ...filter, [this.deletedField]: { $in: [null, undefined] } };
  }
}

export default CatalogScopedRepository;
