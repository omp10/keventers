import { BaseService } from '#core/service/base.service.js';
import { ConflictError } from '#core/errors/app-error.js';

import {
  DEFAULT_SLA_SECONDS,
  KITCHEN_ERRORS,
  SLA_SCOPE,
} from '../constants/kitchen.constants.js';
import { toSlaTargetDTO } from '../dto/kitchen.dto.js';
import { KitchenSlaBreachedEvent } from '../events/kitchen.events.js';
import { kitchenQueueRepository } from '../repositories/kitchen-queue.repository.js';
import { kitchenSlaRepository } from '../repositories/kitchen-sla.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadOwned, resolveBranchScope } from '../utils/tenant.util.js';

/**
 * SLA monitoring. Resolves a configurable preparation target for an order
 * (most-specific-first: product → category → branch default) and detects
 * breaches — a PREPARING entry whose elapsed prep time exceeds its target.
 * It emits a `kitchen.sla.breached` event and NEVER notifies users directly
 * (Notifications/Analytics subscribe).
 */
export class SlaService extends BaseService {
  constructor({ slas = kitchenSlaRepository, queue = kitchenQueueRepository, resolveScope = resolveBranchScope, eventBus } = {}) {
    super({ name: 'kitchen.sla', eventBus });
    this.slas = slas;
    this.queue = queue;
    this.resolveScope = resolveScope;
  }

  #resolveItemTarget(targets, item) {
    const product = targets.find((t) => t.scope === SLA_SCOPE.PRODUCT && String(t.productId) === String(item.productId));
    if (product) return product.targetSeconds;
    const category =
      item.categoryId &&
      targets.find((t) => t.scope === SLA_SCOPE.CATEGORY && String(t.categoryId) === String(item.categoryId));
    if (category) return category.targetSeconds;
    const def = targets.find((t) => t.scope === SLA_SCOPE.DEFAULT);
    return def ? def.targetSeconds : null;
  }

  /**
   * The entry's SLA target = the SLOWEST item's target (the order is late when
   * its slowest item exceeds). Falls back to the global default.
   * @param {object} scope
   * @param {Array<{productId,categoryId}>} orderItems
   */
  async resolveTarget(scope, orderItems = []) {
    const targets = await this.slas.findActiveForBranch(scope);
    let max = null;
    for (const it of orderItems) {
      const t = this.#resolveItemTarget(targets, it);
      if (t != null) max = max == null ? t : Math.max(max, t);
    }
    return max ?? DEFAULT_SLA_SECONDS;
  }

  /** Is this PREPARING entry past its target right now? */
  isBreached(entry, now = new Date()) {
    const target = entry?.sla?.targetSeconds;
    const preparingAt = entry?.timers?.preparingAt;
    if (!target || !preparingAt) return false;
    return (now.getTime() - new Date(preparingAt).getTime()) / 1000 > target;
  }

  /**
   * Sweep PREPARING entries and flag/emit new breaches. Intended for a scheduled
   * job (high-frequency but cheap — indexed candidates only). Idempotent: the
   * `sla.breached` guard ensures one event per entry.
   */
  async sweepBreaches(now = new Date(), limit = 200) {
    const candidates = await this.queue.findSlaCandidates(limit);
    let breached = 0;
    for (const entry of candidates) {
      if (!this.isBreached(entry, now)) continue;
      const marked = await this.queue.markSlaBreached(entityId(entry));
      if (!marked) continue; // already flagged by a concurrent sweep
      breached += 1;
      await this.events.publish(
        new KitchenSlaBreachedEvent({
          entryId: entityId(entry),
          orderId: String(entry.orderId),
          branchId: String(entry.branchId),
          restaurantId: String(entry.restaurantId),
          targetSeconds: entry.sla.targetSeconds,
        }),
      );
      this.audit.failure('kitchen.sla.breached', { targetId: entityId(entry), metadata: { orderId: String(entry.orderId) } });
    }
    return { breached };
  }

  // --- SLA target configuration (branch-scoped) ---

  async createTarget(tenant, restaurantId, branchId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const exists = await this.slas.existsScoped(scope, {
      scope: data.scope,
      productId: data.productId ?? null,
      categoryId: data.categoryId ?? null,
    });
    if (exists) throw new ConflictError('An SLA target already exists for this scope');
    const target = await this.slas.createScoped(scope, {
      scope: data.scope,
      productId: data.productId ?? null,
      categoryId: data.categoryId ?? null,
      targetSeconds: data.targetSeconds,
      isActive: data.isActive ?? true,
    });
    this.audit.success('kitchen.sla.target_created', { actorId, targetId: entityId(target) });
    return toSlaTargetDTO(target);
  }

  async listTargets(tenant, restaurantId, branchId) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const targets = await this.slas.findActiveForBranch(scope);
    return targets.map(toSlaTargetDTO);
  }

  async deleteTarget(tenant, id, actorId = null) {
    await loadOwned(this.slas, tenant, id, KITCHEN_ERRORS.STATION_NOT_FOUND);
    await this.slas.softDeleteById(id);
    this.audit.success('kitchen.sla.target_deleted', { actorId, targetId: String(id) });
    return { id: String(id), deleted: true };
  }
}

export const slaService = new SlaService();
export default slaService;
