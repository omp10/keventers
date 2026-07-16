import { BaseService } from '#core/service/base.service.js';

import { MAINTAINED_PERIODS } from '../constants/analytics.constants.js';
import { AnalyticsProjectionUpdatedEvent } from '../events/analytics.events.js';
import { entityProjectionRepository } from '../repositories/entity-projection.repository.js';
import { timeBucketRepository } from '../repositories/time-bucket.repository.js';
import { analyticsRedisStore } from '../stores/analytics-redis.store.js';
import { periodKeys } from '../utils/period.util.js';

/**
 * Projection WRITE engine. Applies a list of pure INSTRUCTIONS (from the domain
 * updaters) to the read-optimized projection collections: a `bucket` instruction
 * is fanned across every maintained granularity (hour/day/week/month/year/all)
 * at the event time; an `entity` instruction hits its single leaderboard row.
 * Writes never touch business data. Dashboard caches are invalidated on write.
 * This is the ONLY module surface that mutates projections.
 */
export class ProjectionService extends BaseService {
  constructor({ buckets = timeBucketRepository, entities = entityProjectionRepository, store = analyticsRedisStore, eventBus } = {}) {
    super({ name: 'analytics.projection', eventBus });
    this.buckets = buckets;
    this.entities = entities;
    this.store = store;
  }

  /**
   * Apply instructions for a scoped event at time `at`.
   * @param {{organizationId,restaurantId,branchId?}} scope
   * @param {Array} instructions
   * @param {Date} at
   */
  async apply(scope, instructions, at = new Date()) {
    if (!scope?.organizationId || !scope?.restaurantId || !instructions?.length) return { applied: 0 };
    const keys = periodKeys(at);
    let applied = 0;
    const domains = new Set();

    for (const ins of instructions) {
      if (!ins) continue;
      if (ins.kind === 'bucket') {
        for (const period of MAINTAINED_PERIODS) {
          // Peak histograms only make sense on day+ buckets.
          const hist = period === 'day' ? ins.hist : null;
          await this.buckets.increment(scope, ins.domain, period, keys[period], ins.inc, hist);
          applied += 1;
        }
        domains.add(ins.domain);
      } else if (ins.kind === 'entity') {
        await this.entities.increment(scope, ins.domain, ins.entityType, ins.entityId, ins.inc, ins.name);
        applied += 1;
        domains.add(ins.domain);
      }
    }

    await this.store.invalidateRestaurant(String(scope.restaurantId));
    await this.events.publish(new AnalyticsProjectionUpdatedEvent({ restaurantId: String(scope.restaurantId), organizationId: String(scope.organizationId), domains: [...domains], at: at.toISOString?.() ?? String(at) }));
    return { applied, domains: [...domains] };
  }

  /**
   * REBUILD accumulator: merge a scoped item's instructions into `acc` (Maps of
   * bucket/entity increments keyed by their unique projection key), fanning bucket
   * instructions across every granularity. Many orders collapse into a handful of
   * bulk upserts on flush — no per-order round trips, no per-event cache churn.
   */
  accumulate(acc, scope, instructions, at) {
    const keys = periodKeys(at);
    for (const ins of instructions) {
      if (ins?.kind === 'bucket') {
        for (const period of MAINTAINED_PERIODS) {
          const periodKey = keys[period];
          const hist = period === 'day' ? ins.hist : null;
          const mapKey = `${scope.organizationId}|${scope.restaurantId}|${scope.branchId ?? ''}|${ins.domain}|${period}|${periodKey}`;
          const cur = acc.buckets.get(mapKey) ?? { scope, domain: ins.domain, period, periodKey, inc: {}, hist: null };
          for (const [k, v] of Object.entries(ins.inc)) cur.inc[k] = (cur.inc[k] ?? 0) + v;
          if (hist?.hourly) { cur.hist = cur.hist ?? {}; cur.hist.hourly = { idx: hist.hourly.idx, by: (cur.hist.hourly?.by ?? 0) + (hist.hourly.by ?? 1) }; }
          if (hist?.weekday) { cur.hist = cur.hist ?? {}; cur.hist.weekday = { idx: hist.weekday.idx, by: (cur.hist.weekday?.by ?? 0) + (hist.weekday.by ?? 1) }; }
          acc.buckets.set(mapKey, cur);
        }
      } else if (ins?.kind === 'entity') {
        const mapKey = `${scope.organizationId}|${scope.restaurantId}|${scope.branchId ?? ''}|${ins.domain}|${ins.entityType}|${ins.entityId}`;
        const cur = acc.entities.get(mapKey) ?? { scope, domain: ins.domain, entityType: ins.entityType, entityId: ins.entityId, inc: {}, name: ins.name };
        for (const [k, v] of Object.entries(ins.inc)) cur.inc[k] = (cur.inc[k] ?? 0) + v;
        if (ins.name) cur.name = ins.name;
        acc.entities.set(mapKey, cur);
      }
    }
  }

  /** Flush an accumulator to the projection collections via two bulkWrites. */
  async flush(acc) {
    const buckets = [...acc.buckets.values()];
    const entities = [...acc.entities.values()];
    if (typeof this.buckets.bulkIncrement === 'function') await this.buckets.bulkIncrement(buckets);
    else await Promise.all(buckets.map((x) => this.buckets.increment(x.scope, x.domain, x.period, x.periodKey, x.inc, x.hist)));
    if (typeof this.entities.bulkIncrement === 'function') await this.entities.bulkIncrement(entities);
    else await Promise.all(entities.map((x) => this.entities.increment(x.scope, x.domain, x.entityType, x.entityId, x.inc, x.name)));
  }
}

/** A fresh rebuild accumulator. */
export function newAccumulator() {
  return { buckets: new Map(), entities: new Map() };
}

export const projectionService = new ProjectionService();
export default projectionService;
