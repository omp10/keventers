import { BaseRepository } from '#core/repository/base.repository.js';

/**
 * Tenant-scoped repository base for analytics projections (org + restaurant;
 * branch optional). Whitelists tenant fields in `paginateScoped` so buildFilter
 * can never strip the scope — analytics is never exposed across tenants.
 */
export class AnalyticsScopedRepository extends BaseRepository {
  scopedFilter(scope, filter = {}) {
    const base = { ...filter, organizationId: scope.organizationId, restaurantId: scope.restaurantId };
    if (scope.branchId !== undefined) base.branchId = scope.branchId ?? null;
    return base;
  }

  paginateScoped(scope, params = {}, options = {}) {
    const allowedFilterFields = params.allowedFilterFields
      ? [...new Set([...params.allowedFilterFields, 'organizationId', 'restaurantId', 'branchId'])]
      : params.allowedFilterFields;
    return this.paginate({ ...params, filter: this.scopedFilter(scope, params.filter ?? {}), allowedFilterFields }, options);
  }
}

export default AnalyticsScopedRepository;
