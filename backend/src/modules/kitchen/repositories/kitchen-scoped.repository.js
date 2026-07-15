import { BaseRepository } from '#core/repository/base.repository.js';

/**
 * Tenant-scoped repository base for the Kitchen module. Extends the platform
 * BaseRepository and layers mandatory organization + restaurant (+ optional
 * branch) scoping onto every query, so one branch's kitchen queue is never
 * exposed to another tenant. The trusted tenant fields are whitelisted in
 * `paginateScoped` so buildFilter (which drops any field not in
 * allowedFilterFields) can never strip the scope.
 *
 * @template T
 */
export class KitchenScopedRepository extends BaseRepository {
  scoped(scope, filter = {}) {
    const base = { ...filter, organizationId: scope.organizationId, restaurantId: scope.restaurantId };
    if (scope.branchId) base.branchId = scope.branchId;
    return base;
  }

  createScoped(scope, data, options = {}) {
    const stamped = { ...data, organizationId: scope.organizationId, restaurantId: scope.restaurantId };
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
    const allowedFilterFields = params.allowedFilterFields
      ? [...new Set([...params.allowedFilterFields, 'organizationId', 'restaurantId', 'branchId'])]
      : params.allowedFilterFields;
    return this.paginate({ ...params, filter: this.scoped(scope, params.filter ?? {}), allowedFilterFields }, options);
  }

  countScoped(scope, filter = {}, options = {}) {
    return this.count(this.scoped(scope, filter), options);
  }

  existsScoped(scope, filter = {}, options = {}) {
    return this.exists(this.scoped(scope, filter), options);
  }
}

export default KitchenScopedRepository;
