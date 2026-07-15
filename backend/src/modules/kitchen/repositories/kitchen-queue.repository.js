import { ACTIVE_KITCHEN_STATUSES, KITCHEN_STATUS } from '../constants/kitchen.constants.js';
import { KitchenQueueEntry } from '../models/kitchen-queue-entry.model.js';

import { KitchenScopedRepository } from './kitchen-scoped.repository.js';

/**
 * Kitchen queue repository. Entries are historical records (no soft delete).
 * Transitions use an OPTIMISTIC version guard + atomic timeline push. Tenant
 * scope is applied via the branch-scoped base.
 */
export class KitchenQueueRepository extends KitchenScopedRepository {
  constructor(model = KitchenQueueEntry) {
    super(model, { softDelete: false, searchableFields: ['orderNumber'] });
  }

  /** Idempotent-enqueue lookup (unique orderId). Not tenant-scoped: the order id
   * is server-supplied by the trusted event handler. */
  findByOrderId(orderId) {
    return this.findOne({ orderId });
  }

  /** Active board for a branch (priority-weighted FIFO handled by the service). */
  findActiveForBranch(scope, extraFilter = {}) {
    return this.findScoped(
      scope,
      { ...extraFilter, status: { $in: ACTIVE_KITCHEN_STATUSES } },
      { sort: 'timers.queuedAt' },
    );
  }

  paginateForBranch(scope, params = {}) {
    return this.paginateScoped(scope, {
      ...params,
      allowedFilterFields: ['status', 'priority', 'stationIds', 'assignment.currentChefId'],
    });
  }

  /** PREPARING entries whose target may have elapsed (SLA sweep candidates). */
  findSlaCandidates(limit = 200) {
    return this.find(
      { status: KITCHEN_STATUS.PREPARING, 'sla.breached': false, 'sla.targetSeconds': { $ne: null } },
      { limit },
    );
  }

  /**
   * Atomic, optimistically-versioned transition: applies field set, pushes an
   * immutable timeline entry and bumps the version — only if the stored version
   * matches. Returns the updated entry, or null on conflict.
   */
  async transitionWithVersion(id, expectedVersion, { set = {}, timelineEntry, inc }) {
    const update = { $set: set, $inc: { version: 1, ...(inc ?? {}) } };
    if (timelineEntry) update.$push = { timeline: timelineEntry };
    const doc = await this.model.findOneAndUpdate(
      { _id: id, version: expectedVersion },
      update,
      { new: true, runValidators: true },
    );
    return this.toDomain(doc);
  }

  /** Mark an SLA breach once (idempotent guard on sla.breached). */
  async markSlaBreached(id) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, 'sla.breached': false },
      { $set: { 'sla.breached': true, 'sla.breachedAt': new Date() } },
      { new: true },
    );
    return this.toDomain(doc);
  }
}

export const kitchenQueueRepository = new KitchenQueueRepository();
export default kitchenQueueRepository;
