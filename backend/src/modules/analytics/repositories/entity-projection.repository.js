import { EntityProjection } from '../models/entity-projection.model.js';

import { AnalyticsScopedRepository } from './analytics-scoped.repository.js';

/**
 * EntityProjection repository. `increment` is an atomic upsert-`$inc` on the
 * unique (scope, domain, entityType, entityId) key. `topBy` powers best/worst
 * leaderboards with an indexed sort + limit.
 */
export class EntityProjectionRepository extends AnalyticsScopedRepository {
  constructor(model = EntityProjection) {
    super(model, { softDelete: false });
  }

  #key(scope, domain, entityType, entityId) {
    return {
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId ?? null,
      domain,
      entityType,
      entityId: String(entityId),
    };
  }

  async increment(scope, domain, entityType, entityId, inc = {}, name = null) {
    const $inc = {};
    for (const [k, v] of Object.entries(inc)) if (v) $inc[`metrics.${k}`] = v;
    if (!Object.keys($inc).length) return null;
    const set = { lastEventAt: new Date() };
    if (name) set.name = name;
    const doc = await this.model.findOneAndUpdate(
      this.#key(scope, domain, entityType, entityId),
      { $inc, $set: set, $setOnInsert: this.#key(scope, domain, entityType, entityId) },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return this.toDomain(doc);
  }

  /** Batched upsert-`$inc` (rebuild fast path). `ops` = [{ scope, domain, entityType, entityId, inc, name }]. */
  async bulkIncrement(ops = []) {
    if (!ops.length) return { modified: 0 };
    const writes = ops.map(({ scope, domain, entityType, entityId, inc = {}, name = null }) => {
      const key = this.#key(scope, domain, entityType, entityId);
      const $inc = {};
      for (const [k, v] of Object.entries(inc)) if (v) $inc[`metrics.${k}`] = v;
      const update = { $inc, $setOnInsert: key };
      if (name) update.$set = { name };
      return { updateOne: { filter: key, update, upsert: true } };
    }).filter((w) => Object.keys(w.updateOne.update.$inc).length);
    if (!writes.length) return { modified: 0 };
    const res = await this.model.bulkWrite(writes, { ordered: false });
    return { modified: (res.modifiedCount ?? 0) + (res.upsertedCount ?? 0) };
  }

  /** Top/bottom N entities of a type by a metric key. */
  async topBy(scope, domain, entityType, metricKey, { limit = 10, ascending = false } = {}) {
    const docs = await this.model
      .find({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, branchId: scope.branchId ?? null, domain, entityType })
      .sort({ [`metrics.${metricKey}`]: ascending ? 1 : -1 })
      .limit(limit)
      .lean();
    return docs.map((d) => this.toDomain(d));
  }

  findByType(scope, domain, entityType) {
    return this.find({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, branchId: scope.branchId ?? null, domain, entityType });
  }

  /** PLATFORM aggregate of an entity type's metrics across all tenants (super-admin). */
  async aggregatePlatform(domain, entityType, { organizationId = null } = {}) {
    const match = { domain, entityType };
    if (organizationId) match.organizationId = organizationId && this.model.base.Types.ObjectId.isValid(organizationId) ? new this.model.base.Types.ObjectId(String(organizationId)) : organizationId;
    const rows = await this.model.aggregate([
      { $match: match },
      { $group: { _id: '$entityId', name: { $first: '$name' }, docs: { $push: '$metrics' } } },
    ], { allowDiskUse: true });
    return rows.map((r) => {
      const metrics = {};
      for (const m of r.docs) for (const [k, v] of Object.entries(m)) metrics[k] = (metrics[k] ?? 0) + (Number(v) || 0);
      return { entityId: r._id, name: r.name, metrics };
    });
  }

  deleteForDomain(scope, domain) {
    return this.model.deleteMany({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, domain });
  }
}

export const entityProjectionRepository = new EntityProjectionRepository();
export default entityProjectionRepository;
