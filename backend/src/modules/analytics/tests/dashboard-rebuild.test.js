import { describe, expect, it } from 'vitest';

import { DashboardService } from '../services/dashboard.service.js';
import { RebuildService } from '../services/rebuild.service.js';
import { ProjectionService } from '../services/projection.service.js';
import { ANALYTICS_EVENTS } from '../events/analytics.events.js';
import { DOMAIN, METRIC, PERIOD, RECON_STATUS } from '../constants/analytics.constants.js';
import * as salesOrder from '../projections/sales-order.updater.js';

import { SCOPE, FakeBucketRepo, FakeEntityRepo, createFakeEventBus, fakeStore } from './_helpers.js';

const tenant = { id: 't' };
const resolveScope = async () => SCOPE;

function makeOrder(over = {}) {
  return { id: 'o1', organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1', status: 'completed', createdAt: '2026-07-15T09:00:00Z', completedAt: '2026-07-15T09:10:00Z', pricing: { subtotal: { amount: 100000 }, tax: { amount: 0 }, discount: { amount: 0 }, total: { amount: 100000 } }, items: [{ productId: 'p1', product: { name: 'X' }, quantity: 1 }], ...over };
}

/** Seed projections by applying updaters through the real ProjectionService. */
async function seed(buckets, entities, orders) {
  const proj = new ProjectionService({ buckets, entities, store: fakeStore, eventBus: createFakeEventBus() });
  for (const o of orders) {
    await proj.apply(SCOPE, salesOrder.onOrderPlaced(o, new Date(o.createdAt)), new Date(o.createdAt));
    await proj.apply(SCOPE, salesOrder.onOrderCompleted(o, new Date(o.completedAt)), new Date(o.completedAt));
  }
}

describe('DashboardService — reads from projections', () => {
  it('sales summary sums the day buckets in range (never touches orders)', async () => {
    const buckets = new FakeBucketRepo();
    const entities = new FakeEntityRepo();
    await seed(buckets, entities, [makeOrder(), makeOrder({ id: 'o2' })]);
    const svc = new DashboardService({ buckets, entities, store: fakeStore, resolveScope });
    const range = { from: new Date('2026-07-15T00:00:00Z'), to: new Date('2026-07-15T23:59:59Z'), period: PERIOD.DAY };
    const out = await svc.sales(tenant, 'rest1', range);
    expect(out.summary.netRevenue).toBe(200000);
    expect(out.summary.ordersCompleted).toBe(2);
    expect(out.summary.averageOrderValue).toBe(100000);
  });

  it('products leaderboard returns best sellers by units', async () => {
    const buckets = new FakeBucketRepo();
    const entities = new FakeEntityRepo();
    await seed(buckets, entities, [makeOrder(), makeOrder({ id: 'o2' })]);
    const svc = new DashboardService({ buckets, entities, store: fakeStore, resolveScope });
    const out = await svc.products(tenant, 'rest1');
    expect(out.bestSelling[0].entityId).toBe('p1');
    expect(out.bestSelling[0].metrics[METRIC.UNITS_SOLD]).toBe(2);
  });
});

/** Order-service double: server-side aggregate for reconcile + keyset batches for rebuild. */
function fakeOrders(orders) {
  return {
    async aggregateSalesForRestaurantSystem(_id, { statuses = ['completed'] } = {}) {
      const rows = orders.filter((o) => statuses.includes(o.status));
      return { orderCount: rows.length, netRevenue: rows.reduce((s, o) => s + Number(o.pricing?.total?.amount ?? 0), 0) };
    },
    async listForRestaurantBatchSystem(_id, { afterId = null, limit = 500 } = {}) {
      const start = afterId ? orders.findIndex((o) => o.id === afterId) + 1 : 0;
      const items = orders.slice(start, start + limit);
      const last = items[items.length - 1];
      return { items, cursor: last ? { afterCreatedAt: last.createdAt, afterId: last.id } : null, done: items.length < limit };
    },
  };
}

describe('RebuildService — reconcile (report-only, server-side aggregate, no mutation)', () => {
  it('reports CONSISTENT when projections match authoritative orders', async () => {
    const buckets = new FakeBucketRepo();
    const entities = new FakeEntityRepo();
    const orders = [makeOrder(), makeOrder({ id: 'o2' })];
    await seed(buckets, entities, orders);
    const svc = new RebuildService({ runs: fakeRuns(), buckets, entities, orders: fakeOrders(orders), resolveScope, rebuildCfg: { reconcileToleranceMinor: 100 }, eventBus: createFakeEventBus() });
    const dto = await svc.reconcile(tenant, 'rest1', { from: new Date('2026-07-15T00:00:00Z'), to: new Date('2026-07-15T23:59:59Z') });
    expect(dto.reconStatus).toBe(RECON_STATUS.CONSISTENT);
    expect(dto.mismatches).toHaveLength(0);
  });

  it('reports INCONSISTENT + publishes ReconciliationFailed when they drift', async () => {
    const buckets = new FakeBucketRepo();
    const entities = new FakeEntityRepo();
    await seed(buckets, entities, [makeOrder()]); // projection has 1 order
    const events = createFakeEventBus();
    const svc = new RebuildService({ runs: fakeRuns(), buckets, entities, orders: fakeOrders([makeOrder(), makeOrder({ id: 'o2' })]), resolveScope, rebuildCfg: { reconcileToleranceMinor: 100 }, eventBus: events });
    const dto = await svc.reconcile(tenant, 'rest1', { from: new Date('2026-07-15T00:00:00Z'), to: new Date('2026-07-15T23:59:59Z') });
    expect(dto.reconStatus).toBe(RECON_STATUS.INCONSISTENT);
    expect(dto.mismatches.length).toBeGreaterThan(0);
    expect(events.names()).toContain(ANALYTICS_EVENTS.RECONCILIATION_FAILED);
  });
});

describe('RebuildService — full rebuild (enqueue → batched worker)', () => {
  it('fullRebuild ENQUEUES the work off the request thread and returns a RUNNING run', async () => {
    const enqueued = [];
    const svc = new RebuildService({ runs: fakeRuns(), buckets: new FakeBucketRepo(), entities: new FakeEntityRepo(), orders: fakeOrders([]), resolveScope, rebuildCfg: {}, enqueueRebuild: async (d) => enqueued.push(d), eventBus: createFakeEventBus() });
    const dto = await svc.fullRebuild(tenant, 'rest1', 'staff-1');
    expect(dto.status).toBe('running');
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]).toMatchObject({ scope: SCOPE, runId: dto.id });
  });

  it('runQueuedRebuild clears + replays orders in keyset batches into projections', async () => {
    const buckets = new FakeBucketRepo();
    const entities = new FakeEntityRepo();
    const orders = [makeOrder(), makeOrder({ id: 'o2' })];
    const svc = new RebuildService({ runs: fakeRuns(), buckets, entities, projections: new ProjectionService({ buckets, entities, store: fakeStore, eventBus: createFakeEventBus() }), orders: fakeOrders(orders), resolveScope, rebuildCfg: { batchSize: 1 }, eventBus: createFakeEventBus() });
    const res = await svc.runQueuedRebuild({ scope: SCOPE, runId: 'run-1' });
    expect(res.processed).toBe(2);
    const all = await buckets.findBucket(SCOPE, DOMAIN.SALES, PERIOD.ALL, 'all');
    expect(all.metrics[METRIC.NET_REVENUE]).toBe(200000);
  });
});

function fakeRuns() {
  const docs = new Map();
  return {
    async createScoped(scope, data) { const id = `run-${docs.size + 1}`; const doc = { _id: id, id, ...data }; docs.set(id, doc); return { ...doc }; },
    async updateById(id, patch) { const d = docs.get(id); Object.assign(d, patch); return { ...d }; },
  };
}
