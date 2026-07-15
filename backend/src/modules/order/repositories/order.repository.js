import { BaseRepository } from '#core/repository/base.repository.js';

import { Order } from '../models/order.model.js';

/**
 * Order repository — the only MongoDB access for orders. Tenant-scoped finders
 * (staff pass a resolved org/restaurant/branch scope; guests are scoped by their
 * session). Transitions use an OPTIMISTIC version guard + an atomic timeline
 * push so concurrent updates can't corrupt the aggregate.
 */
export class OrderRepository extends BaseRepository {
  constructor(model = Order) {
    super(model, { softDelete: true, searchableFields: ['orderNumber'] });
  }

  findByCartId(cartId) {
    return this.findOne({ cartId });
  }

  findByOrderNumber(orderNumber) {
    return this.findOne({ orderNumber });
  }

  async findLatestBySession(sessionId) {
    const docs = await this.find({ sessionId }, { sort: '-createdAt', limit: 1 });
    return docs[0] ?? null;
  }

  /**
   * All of a customer's orders within a restaurant (trusted internal read — used
   * by the Customer Platform to list history + rebuild analytics projections on
   * a guest→customer merge). Optionally filtered to a set of statuses.
   */
  findByCustomer(restaurantId, customerUserId, { statuses = null, limit = 1000 } = {}) {
    const filter = { restaurantId, customerUserId };
    if (statuses?.length) filter.status = { $in: statuses };
    return this.find(filter, { sort: '-createdAt', limit });
  }

  /**
   * Orders for a restaurant within a completed-at/created-at window (trusted
   * internal read — used ONLY by the Analytics rebuild/reconciliation paths to
   * recompute projections from authoritative data). Sorted ascending by time.
   */
  findByRestaurantRange(restaurantId, { from = null, to = null, statuses = null, limit = 5000 } = {}) {
    const filter = { restaurantId };
    if (statuses?.length) filter.status = { $in: statuses };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }
    return this.find(filter, { sort: 'createdAt', limit });
  }

  /**
   * KEYSET-paginated batch of a restaurant's orders (trusted rebuild read). Pulls
   * a bounded page after `(afterCreatedAt, afterId)` so a full rebuild streams the
   * history in memory-safe chunks instead of loading it all at once. `.lean()`
   * avoids full Mongoose hydration of large order docs.
   */
  findByRestaurantBatch(restaurantId, { from = null, to = null, statuses = null, afterCreatedAt = null, afterId = null, limit = 500 } = {}) {
    const filter = { restaurantId };
    if (statuses?.length) filter.status = { $in: statuses };
    const created = {};
    if (from) created.$gte = from;
    if (to) created.$lte = to;
    if (afterCreatedAt && afterId) {
      filter.$or = [
        { createdAt: { ...created, $gt: afterCreatedAt } },
        { createdAt: afterCreatedAt, _id: { $gt: afterId } },
      ];
    } else if (Object.keys(created).length) {
      filter.createdAt = created;
    }
    return this.model.find(filter).sort({ createdAt: 1, _id: 1 }).limit(limit).lean();
  }

  /**
   * Server-side authoritative sales aggregate for a restaurant in a window
   * (trusted reconciliation read). Computes count + net revenue WITHOUT
   * transferring any documents — indexed by (restaurantId,status,createdAt).
   */
  async aggregateSalesForRestaurant(restaurantId, { from = null, to = null, statuses = ['completed'] } = {}) {
    const match = { restaurantId: this.#oid(restaurantId) };
    if (statuses?.length) match.status = { $in: statuses };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = from;
      if (to) match.createdAt.$lte = to;
    }
    const [row] = await this.model.aggregate([
      { $match: match },
      { $group: { _id: null, orderCount: { $sum: 1 }, netRevenue: { $sum: { $ifNull: ['$pricing.total.amount', 0] } } } },
    ]);
    return { orderCount: row?.orderCount ?? 0, netRevenue: row?.netRevenue ?? 0 };
  }

  #oid(id) {
    return this.model.base.Types.ObjectId.isValid(id) ? new this.model.base.Types.ObjectId(String(id)) : id;
  }

  #staffFilter(scope, extra = {}) {
    const filter = { ...extra, organizationId: scope.organizationId, restaurantId: scope.restaurantId };
    if (scope.branchId) filter.branchId = scope.branchId;
    return filter;
  }

  /** Paginated staff/admin listing (tenant-scoped + filters/sort/search). The
   * tenant fields are included in allowedFilterFields so the trusted scope is
   * NEVER stripped by buildFilter (which drops any field not listed). */
  paginateForStaff(scope, params = {}) {
    return this.paginate({
      ...params,
      filter: this.#staffFilter(scope, params.filter ?? {}),
      allowedFilterFields: [
        'organizationId',
        'restaurantId',
        'branchId',
        'status',
        'orderType',
        'customerUserId',
        'tableId',
      ],
    });
  }

  /** Paginated customer listing (their guest session only). */
  paginateForSession(sessionId, params = {}) {
    return this.paginate({
      ...params,
      filter: { ...(params.filter ?? {}), sessionId },
      allowedFilterFields: ['sessionId', 'status', 'orderType'],
    });
  }

  /**
   * Apply a status transition atomically: only if the stored version matches,
   * setting fields, PUSHING an immutable timeline entry, and bumping the version.
   * Returns the updated order, or null on a version conflict.
   */
  async transitionWithVersion(id, expectedVersion, { set = {}, timelineEntry }) {
    const update = { $set: set, $inc: { version: 1 } };
    if (timelineEntry) update.$push = { timeline: timelineEntry };
    const doc = await this.model.findOneAndUpdate(
      { _id: id, version: expectedVersion },
      update,
      { new: true, runValidators: true },
    );
    return this.toDomain(doc);
  }

  /** Append a note (append-only). */
  async addNote(id, note) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id },
      { $push: { notes: note } },
      { new: true },
    );
    return this.toDomain(doc);
  }

  /** Backfill the customer on a session's orders when a guest logs in. */
  linkCustomerBySession(sessionId, customerUserId) {
    return this.model.updateMany({ sessionId }, { $set: { customerUserId } });
  }
}

export const orderRepository = new OrderRepository();
export default orderRepository;
