import { BaseService } from '#core/service/base.service.js';
import { config } from '#config';
import { Scheduler } from '#platform/jobs/index.js';
import { orderService } from '#modules/order/index.js';

import {
  DOMAIN,
  PERIOD,
  REBUILD_STATUS,
  REBUILD_TYPE,
  RECON_STATUS,
} from '../constants/analytics.constants.js';
import { toRebuildRunDTO } from '../dto/analytics.dto.js';
import {
  AnalyticsRebuildCompletedEvent,
  AnalyticsRebuildStartedEvent,
  AnalyticsReconciliationFailedEvent,
} from '../events/analytics.events.js';
import { QUEUES, JOB_NAMES } from '../constants/analytics.constants.js';
import { entityProjectionRepository } from '../repositories/entity-projection.repository.js';
import { rebuildRunRepository } from '../repositories/rebuild-run.repository.js';
import { timeBucketRepository } from '../repositories/time-bucket.repository.js';
import * as salesOrder from '../projections/sales-order.updater.js';
import { periodKeys } from '../utils/period.util.js';
import { entityId } from '../utils/id.util.js';
import { resolveRestaurantScope } from '../utils/tenant.util.js';

import { newAccumulator, projectionService } from './projection.service.js';

/**
 * Rebuild & Reconciliation service — the ONLY sanctioned path that reads
 * TRANSACTIONAL data. A FULL rebuild recomputes the order-derived projections
 * (sales / orders / products) for a restaurant from its authoritative order
 * history via a trusted read seam, replacing the projection collections
 * atomically-enough (clear → replay). RECONCILIATION compares projection totals
 * against authoritative sums and REPORTS mismatches WITHOUT mutating data —
 * surfacing drift for investigation. Every run is tracked + audited.
 */
export class RebuildService extends BaseService {
  constructor({
    runs = rebuildRunRepository,
    buckets = timeBucketRepository,
    entities = entityProjectionRepository,
    projections = projectionService,
    orders = orderService,
    resolveScope = resolveRestaurantScope,
    rebuildCfg = config.analytics.rebuild,
    // Enqueue seam (injectable for tests); defaults to the BullMQ scheduler.
    enqueueRebuild = (data) => Scheduler.enqueue(QUEUES.REBUILD, JOB_NAMES.REBUILD, data),
    eventBus,
  } = {}) {
    super({ name: 'analytics.rebuild', eventBus });
    this.runs = runs;
    this.buckets = buckets;
    this.entities = entities;
    this.projections = projections;
    this.orders = orders;
    this.resolveScope = resolveScope;
    this.cfg = rebuildCfg;
    this.enqueueRebuild = enqueueRebuild;
  }

  #instructionsForOrder(order) {
    const created = order.createdAt ? new Date(order.createdAt) : new Date();
    const out = [{ at: created, ins: salesOrder.onOrderPlaced(order, created) }];
    if (order.status === 'completed') {
      const at = order.completedAt ? new Date(order.completedAt) : created;
      out.push({ at, ins: salesOrder.onOrderCompleted(order, at) });
    } else if (order.status === 'cancelled') {
      out.push({ at: created, ins: salesOrder.onOrderCancelled(order) });
    }
    return out;
  }

  /**
   * FULL rebuild ENTRY — resolves scope, records a RUNNING run, and ENQUEUES the
   * work onto the analytics:rebuild queue, returning immediately (202). The heavy
   * recompute NEVER runs on the request thread. If the queue is unavailable the
   * run is marked FAILED so it's visible rather than silently stuck.
   */
  async fullRebuild(tenant, restaurantId, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const run = await this.runs.createScoped(scope, { type: REBUILD_TYPE.FULL, status: REBUILD_STATUS.RUNNING, triggeredBy: actorId });
    await this.events.publish(new AnalyticsRebuildStartedEvent({ runId: entityId(run), restaurantId: scope.restaurantId, type: REBUILD_TYPE.FULL }));
    try {
      await this.enqueueRebuild({ scope, runId: entityId(run), actorId });
    } catch (err) {
      await this.runs.updateById(entityId(run), { status: REBUILD_STATUS.FAILED, error: `enqueue failed: ${err.message}`, completedAt: new Date() });
      throw err;
    }
    this.audit.success('analytics.rebuild.enqueued', { actorId, targetId: entityId(run) });
    return toRebuildRunDTO(run);
  }

  /**
   * Queued FULL rebuild WORKER — clears the order-derived projections, then
   * streams the restaurant's order history in memory-safe keyset batches,
   * ACCUMULATING each batch into a handful of bulkWrite upserts. O(batches) round
   * trips, bounded memory — scales to 100k+ orders.
   */
  async runQueuedRebuild({ scope, runId, actorId = null } = {}) {
    if (!scope?.restaurantId || !runId) return { skipped: true };
    const started = Date.now();
    try {
      await this.buckets.deleteDomain(scope, DOMAIN.SALES);
      await this.buckets.deleteDomain(scope, DOMAIN.ORDERS);
      await this.entities.deleteForDomain(scope, DOMAIN.PRODUCTS);

      const batchSize = this.cfg.batchSize ?? 500;
      let processed = 0;
      let cursor = null;
      for (;;) {
        const page = await this.orders.listForRestaurantBatchSystem(scope.restaurantId, { ...cursor, limit: batchSize });
        if (!page.items.length) break;
        const acc = newAccumulator();
        for (const order of page.items) {
          for (const { at, ins } of this.#instructionsForOrder(order)) this.projections.accumulate(acc, scope, ins, at);
          processed += 1;
        }
        await this.projections.flush(acc);
        cursor = page.cursor;
        if (page.done || !cursor) break;
      }

      const durationMs = Date.now() - started;
      await this.runs.updateById(runId, { status: REBUILD_STATUS.COMPLETED, processed, completedAt: new Date(), durationMs }).catch(() => null);
      await this.events.publish(new AnalyticsRebuildCompletedEvent({ runId: String(runId), restaurantId: scope.restaurantId, processed, durationMs }));
      this.audit.success('analytics.rebuild', { actorId, targetId: String(runId), metadata: { processed } });
      return { processed };
    } catch (err) {
      await this.runs.updateById(runId, { status: REBUILD_STATUS.FAILED, error: err.message, completedAt: new Date() }).catch(() => null);
      this.audit.failure('analytics.rebuild.failed', { actorId, targetId: String(runId), metadata: { error: err.message } });
      throw err;
    }
  }

  /**
   * Reconcile projections vs authoritative order data for a range. Compares net
   * revenue + completed-order count; reports mismatches beyond tolerance WITHOUT
   * mutating anything. Publishes AnalyticsReconciliationFailed on drift.
   */
  async reconcile(tenant, restaurantId, range, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const run = await this.runs.createScoped(scope, { type: REBUILD_TYPE.RECONCILE, status: REBUILD_STATUS.RUNNING, range: { from: range.from, to: range.to }, triggeredBy: actorId });
    try {
      // Authoritative totals via a SERVER-SIDE aggregate (no document transfer).
      const { orderCount: authCompleted, netRevenue: authNet } = await this.orders.aggregateSalesForRestaurantSystem(scope.restaurantId, { from: range.from, to: range.to, statuses: ['completed'] });

      // Projection totals.
      const fromKey = periodKeys(range.from)[PERIOD.DAY];
      const toKey = periodKeys(range.to)[PERIOD.DAY];
      const projected = await this.buckets.sumRange(scope, DOMAIN.SALES, PERIOD.DAY, fromKey, toKey);
      const projNet = Number(projected.netRevenue ?? 0);
      const orderProj = await this.buckets.sumRange(scope, DOMAIN.ORDERS, PERIOD.DAY, fromKey, toKey);
      const projCompleted = Number(orderProj.ordersCompleted ?? 0);

      const mismatches = [];
      if (Math.abs(projNet - authNet) > this.cfg.reconcileToleranceMinor) mismatches.push({ metric: 'netRevenue', projected: projNet, authoritative: authNet, diff: projNet - authNet });
      if (projCompleted !== authCompleted) mismatches.push({ metric: 'ordersCompleted', projected: projCompleted, authoritative: authCompleted, diff: projCompleted - authCompleted });

      const reconStatus = mismatches.length ? RECON_STATUS.INCONSISTENT : RECON_STATUS.CONSISTENT;
      const done = await this.runs.updateById(entityId(run), { status: REBUILD_STATUS.COMPLETED, reconStatus, mismatches, completedAt: new Date() });
      if (mismatches.length) {
        await this.events.publish(new AnalyticsReconciliationFailedEvent({ runId: entityId(run), restaurantId: scope.restaurantId, mismatches }));
        this.audit.failure('analytics.reconciliation.inconsistent', { actorId, targetId: entityId(run), metadata: { mismatches } });
      } else {
        this.audit.success('analytics.reconciliation.consistent', { actorId, targetId: entityId(run) });
      }
      return toRebuildRunDTO(done);
    } catch (err) {
      await this.runs.updateById(entityId(run), { status: REBUILD_STATUS.FAILED, error: err.message, completedAt: new Date() });
      throw err;
    }
  }

  async listRuns(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const page = await this.runs.paginateForStaff(scope, { filter: query.type ? { type: query.type } : {}, sort: '-createdAt', pagination: { page: query.page, limit: query.limit } });
    return this.paginated(page, toRebuildRunDTO);
  }
}

export const rebuildService = new RebuildService();
export default rebuildService;
