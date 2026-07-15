import { TimeBucketProjection } from '../models/time-bucket-projection.model.js';

import { AnalyticsScopedRepository } from './analytics-scoped.repository.js';

/**
 * TimeBucketProjection repository. `increment` is an atomic upsert-`$inc` on the
 * unique (scope, domain, period, periodKey) key — the projection write path.
 * Reads aggregate a compact (period, periodKey-range) slice; averages are derived
 * from stored sum+count pairs.
 */
export class TimeBucketRepository extends AnalyticsScopedRepository {
  constructor(model = TimeBucketProjection) {
    super(model, { softDelete: false });
  }

  #key(scope, domain, period, periodKey) {
    return {
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId ?? null,
      domain,
      period,
      periodKey,
    };
  }

  /**
   * Atomically apply metric deltas to one bucket (creating it if absent).
   * @param {object} inc   { metricKey: delta, ... } — prefixed to `metrics.*`
   * @param {object} [hist] optional { hourly: {idx, by}, weekday: {idx, by} }
   */
  async increment(scope, domain, period, periodKey, inc = {}, hist = null) {
    const $inc = {};
    for (const [k, v] of Object.entries(inc)) if (v) $inc[`metrics.${k}`] = v;
    if (hist?.hourly) $inc[`hourly.${hist.hourly.idx}`] = hist.hourly.by ?? 1;
    if (hist?.weekday) $inc[`weekday.${hist.weekday.idx}`] = hist.weekday.by ?? 1;
    if (!Object.keys($inc).length) return null;
    const doc = await this.model.findOneAndUpdate(
      this.#key(scope, domain, period, periodKey),
      { $inc, $setOnInsert: this.#key(scope, domain, period, periodKey) },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return this.toDomain(doc);
  }

  findBucket(scope, domain, period, periodKey) {
    return this.findOne(this.#key(scope, domain, period, periodKey));
  }

  /**
   * Batched upsert-`$inc` (rebuild fast path). `ops` = [{ scope, domain, period,
   * periodKey, inc, hist }]. Collapses many increments into ONE bulkWrite round
   * trip instead of a findOneAndUpdate per bucket.
   */
  async bulkIncrement(ops = []) {
    if (!ops.length) return { modified: 0 };
    const writes = ops.map(({ scope, domain, period, periodKey, inc = {}, hist = null }) => {
      const key = this.#key(scope, domain, period, periodKey);
      const $inc = {};
      for (const [k, v] of Object.entries(inc)) if (v) $inc[`metrics.${k}`] = v;
      if (hist?.hourly) $inc[`hourly.${hist.hourly.idx}`] = hist.hourly.by ?? 1;
      if (hist?.weekday) $inc[`weekday.${hist.weekday.idx}`] = hist.weekday.by ?? 1;
      return { updateOne: { filter: key, update: { $inc, $setOnInsert: key }, upsert: true } };
    }).filter((w) => Object.keys(w.updateOne.update.$inc).length);
    if (!writes.length) return { modified: 0 };
    const res = await this.model.bulkWrite(writes, { ordered: false });
    return { modified: (res.modifiedCount ?? 0) + (res.upsertedCount ?? 0) };
  }

  /** All buckets for a domain+period within a periodKey range (inclusive). */
  findRange(scope, domain, period, fromKey, toKey) {
    return this.find(
      {
        organizationId: scope.organizationId,
        restaurantId: scope.restaurantId,
        branchId: scope.branchId ?? null,
        domain,
        period,
        periodKey: { $gte: fromKey, $lte: toKey },
      },
      { sort: 'periodKey' },
    );
  }

  /** Aggregate summed metrics across a range (single reduced object). */
  async sumRange(scope, domain, period, fromKey, toKey) {
    const [row] = await this.model.aggregate([
      {
        $match: {
          organizationId: this.#oid(scope.organizationId),
          restaurantId: this.#oid(scope.restaurantId),
          branchId: scope.branchId ? this.#oid(scope.branchId) : null,
          domain,
          period,
          periodKey: { $gte: fromKey, $lte: toKey },
        },
      },
      { $group: { _id: null, metrics: { $mergeObjects: '$metrics' }, docs: { $push: '$metrics' } } },
    ]);
    // $mergeObjects overwrites; sum manually across docs for correctness.
    if (!row) return {};
    const summed = {};
    for (const m of row.docs) for (const [k, v] of Object.entries(m)) summed[k] = (summed[k] ?? 0) + (Number(v) || 0);
    return summed;
  }

  #oid(id) {
    return this.model.base.Types.ObjectId.isValid(id) ? new this.model.base.Types.ObjectId(String(id)) : id;
  }

  /**
   * PLATFORM aggregate (super-admin only): sum a domain's metrics across ALL
   * tenants for a period range, optionally within one organization.
   */
  async sumPlatform(domain, period, fromKey, toKey, { organizationId = null } = {}) {
    const match = { domain, period, periodKey: { $gte: fromKey, $lte: toKey } };
    if (organizationId) match.organizationId = this.#oid(organizationId);
    const rows = await this.model.aggregate([{ $match: match }, { $group: { _id: null, docs: { $push: '$metrics' } } }], { allowDiskUse: true });
    const summed = {};
    for (const m of rows[0]?.docs ?? []) for (const [k, v] of Object.entries(m)) summed[k] = (summed[k] ?? 0) + (Number(v) || 0);
    return summed;
  }

  /** Delete a range of buckets (used by a rebuild before recompute). */
  deleteRange(scope, domain, period, fromKey, toKey) {
    return this.model.deleteMany({
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId ?? null,
      domain,
      period,
      periodKey: { $gte: fromKey, $lte: toKey },
    });
  }

  /** Delete ALL buckets for a domain in a restaurant (full rebuild clear step). */
  deleteDomain(scope, domain) {
    return this.model.deleteMany({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, domain });
  }
}

export const timeBucketRepository = new TimeBucketRepository();
export default timeBucketRepository;
