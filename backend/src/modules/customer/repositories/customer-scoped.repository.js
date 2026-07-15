import { BaseRepository } from '#core/repository/base.repository.js';

/**
 * Tenant-scoped repository base for the Customer Platform — RESTAURANT scope
 * (organization + restaurant; customers are not branch-scoped). Trusted tenant
 * fields are whitelisted in `paginateScoped` so `buildFilter` (which drops any
 * field not in allowedFilterFields) can never strip the scope — customer data is
 * never exposed across restaurants.
 *
 * @template T
 */
export class CustomerScopedRepository extends BaseRepository {
  scoped(scope, filter = {}) {
    return { ...filter, organizationId: scope.organizationId, restaurantId: scope.restaurantId };
  }

  createScoped(scope, data, options = {}) {
    return this.create({ ...data, organizationId: scope.organizationId, restaurantId: scope.restaurantId }, options);
  }

  findScoped(scope, filter = {}, options = {}) {
    return this.find(this.scoped(scope, filter), options);
  }

  findByIdScoped(scope, id, options = {}) {
    return this.findOne(this.scoped(scope, { _id: id }), options);
  }

  findOneScoped(scope, filter = {}, options = {}) {
    return this.findOne(this.scoped(scope, filter), options);
  }

  countScoped(scope, filter = {}, options = {}) {
    return this.count(this.scoped(scope, filter), options);
  }

  existsScoped(scope, filter = {}, options = {}) {
    return this.exists(this.scoped(scope, filter), options);
  }

  paginateScoped(scope, params = {}, options = {}) {
    const allowedFilterFields = params.allowedFilterFields
      ? [...new Set([...params.allowedFilterFields, 'organizationId', 'restaurantId'])]
      : params.allowedFilterFields;
    return this.paginate({ ...params, filter: this.scoped(scope, params.filter ?? {}), allowedFilterFields }, options);
  }

  /**
   * Optimistically-versioned update: applies `patch` only if the stored version
   * matches, bumping it atomically. Returns the updated doc, or null on conflict.
   */
  async updateWithVersion(id, expectedVersion, patch, extra = {}) {
    const update = { $set: patch, $inc: { version: 1, ...(extra.inc ?? {}) } };
    if (extra.push) update.$push = extra.push;
    const doc = await this.model.findOneAndUpdate({ _id: id, version: expectedVersion }, update, {
      new: true,
      runValidators: true,
    });
    return this.toDomain(doc);
  }
}

export default CustomerScopedRepository;
