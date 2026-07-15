import { BaseRepository } from '#core/repository/base.repository.js';

/**
 * Tenant-scoped repository base for the Notification Engine (organization +
 * restaurant; branch optional). Whitelists the tenant fields in `paginateScoped`
 * so `buildFilter` can never strip the trusted scope — notification data never
 * leaks across tenants.
 */
export class NotificationScopedRepository extends BaseRepository {
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

  countScoped(scope, filter = {}, options = {}) {
    return this.count(this.scoped(scope, filter), options);
  }

  paginateScoped(scope, params = {}, options = {}) {
    const allowedFilterFields = params.allowedFilterFields
      ? [...new Set([...params.allowedFilterFields, 'organizationId', 'restaurantId', 'branchId'])]
      : params.allowedFilterFields;
    return this.paginate({ ...params, filter: this.scoped(scope, params.filter ?? {}), allowedFilterFields }, options);
  }

  async updateWithVersion(id, expectedVersion, patch, extra = {}) {
    const update = { $set: patch, $inc: { version: 1, ...(extra.inc ?? {}) } };
    if (extra.push) update.$push = extra.push;
    const doc = await this.model.findOneAndUpdate({ _id: id, version: expectedVersion }, update, { new: true, runValidators: true });
    return this.toDomain(doc);
  }
}

export default NotificationScopedRepository;
