import { Customer } from '../models/customer.model.js';

import { CustomerScopedRepository } from './customer-scoped.repository.js';

/**
 * Customer repository. Idempotent guest→customer materialization lives here:
 * `upsertForUser` is an atomic find-or-create on the unique
 * (organization, restaurant, userId) key, so concurrent links / first accesses
 * never create duplicate customers.
 */
export class CustomerRepository extends CustomerScopedRepository {
  constructor(model = Customer) {
    super(model, { softDelete: true, searchableFields: ['displayName', 'email', 'phone'] });
  }

  findByUser(scope, userId) {
    return this.findOne({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, userId });
  }

  /**
   * Every customer record this identity has, newest visit first.
   *
   * A customer is one-per-(organization, restaurant), so a person who has ordered
   * at two brands has two records. When someone opens their profile away from a
   * table there is no guest token to name a restaurant, so we answer with the one
   * they used most recently — the only defensible default, and the one they're
   * thinking of. Backed by the `userId` index.
   */
  findAllForUser(userId) {
    return this.model
      .find({ userId, deletedAt: null })
      .sort({ 'stats.lastVisitAt': -1, updatedAt: -1 })
      .lean()
      .then((docs) => docs.map((d) => this.toDomain(d)));
  }

  /**
   * Atomic find-or-create for (org, restaurant, userId). Returns
   * `{ customer, created }`. Fields in `onInsert` are applied ONLY on creation,
   * preserving an existing customer's data (idempotent merge).
   */
  async upsertForUser(scope, userId, onInsert = {}) {
    const filter = { organizationId: scope.organizationId, restaurantId: scope.restaurantId, userId };
    const before = await this.model.findOne(filter).lean();
    const doc = await this.model.findOneAndUpdate(
      filter,
      { $setOnInsert: { ...filter, ...onInsert } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return { customer: this.toDomain(doc), created: !before };
  }

  /** Append a timeline entry (bounded to the newest `limit`). */
  async pushTimeline(id, entry, limit = 50) {
    const doc = await this.model.findByIdAndUpdate(
      id,
      { $push: { timeline: { $each: [entry], $slice: -Math.abs(limit) } } },
      { new: true },
    );
    return this.toDomain(doc);
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, {
      ...params,
      allowedFilterFields: ['accountStatus', 'origin', 'tags'],
    });
  }

  // ==================== ANALYTICS PROJECTION ====================

  /** Atomic stat increments (+ $set for timestamps / derived fields). */
  async incStats(customerId, inc = {}, set = {}) {
    const $inc = {};
    for (const [k, v] of Object.entries(inc)) if (v) $inc[`stats.${k}`] = v;
    const update = {};
    if (Object.keys($inc).length) update.$inc = $inc;
    const $set = {};
    for (const [k, v] of Object.entries(set)) $set[`stats.${k}`] = v;
    if (Object.keys($set).length) update.$set = $set;
    if (!Object.keys(update).length) return this.findById(customerId);
    const doc = await this.model.findByIdAndUpdate(customerId, update, { new: true });
    return this.toDomain(doc);
  }

  /** Overwrite the whole stats projection (event-sourced recompute — idempotent). */
  async setStats(customerId, stats) {
    const doc = await this.model.findByIdAndUpdate(customerId, { $set: { stats } }, { new: true });
    return this.toDomain(doc);
  }

  /**
   * Merge per-product order counters into the bounded top-N favorites list.
   * Best-effort read-modify-write (order.completed is delivered once per order).
   */
  async bumpFavoriteProducts(customerId, items = [], limit = 10) {
    if (!items.length) return null;
    const doc = await this.model.findById(customerId);
    if (!doc) return null;
    const map = new Map((doc.stats?.favoriteProducts ?? []).map((f) => [String(f.productId), { productId: f.productId, name: f.name, orderedCount: f.orderedCount }]));
    for (const it of items) {
      if (!it.productId) continue;
      const key = String(it.productId);
      const cur = map.get(key) ?? { productId: it.productId, name: it.name ?? null, orderedCount: 0 };
      cur.orderedCount += it.quantity ?? 1;
      if (it.name) cur.name = it.name;
      map.set(key, cur);
    }
    doc.stats.favoriteProducts = [...map.values()].sort((a, b) => b.orderedCount - a.orderedCount).slice(0, limit);
    await doc.save();
    return this.toDomain(doc);
  }
}

export const customerRepository = new CustomerRepository();
export default customerRepository;
