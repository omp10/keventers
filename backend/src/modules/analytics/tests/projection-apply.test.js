import { describe, expect, it } from 'vitest';

import { ProjectionService } from '../services/projection.service.js';
import { ANALYTICS_EVENTS } from '../events/analytics.events.js';
import { DOMAIN, ENTITY_TYPE, METRIC, PERIOD } from '../constants/analytics.constants.js';
import { bucket, entity } from '../projections/instruction.js';

import { SCOPE, FakeBucketRepo, FakeEntityRepo, createFakeEventBus, fakeStore } from './_helpers.js';

function build() {
  const buckets = new FakeBucketRepo();
  const entities = new FakeEntityRepo();
  const events = createFakeEventBus();
  const service = new ProjectionService({ buckets, entities, store: fakeStore, eventBus: events });
  return { service, buckets, entities, events };
}

describe('ProjectionService.apply', () => {
  it('fans a bucket instruction across all six granularities', async () => {
    const ctx = build();
    await ctx.service.apply(SCOPE, [bucket(DOMAIN.SALES, { [METRIC.NET_REVENUE]: 85000 })], new Date('2026-07-15T09:00:00Z'));
    // hour/day/week/month/year/all
    expect(ctx.buckets.countFor(DOMAIN.SALES, PERIOD.HOUR)).toBe(1);
    expect(ctx.buckets.countFor(DOMAIN.SALES, PERIOD.DAY)).toBe(1);
    expect(ctx.buckets.countFor(DOMAIN.SALES, PERIOD.ALL)).toBe(1);
    const day = await ctx.buckets.findBucket(SCOPE, DOMAIN.SALES, PERIOD.DAY, '2026-07-15');
    expect(day.metrics[METRIC.NET_REVENUE]).toBe(85000);
  });

  it('accumulates across events (idempotent single-delivery increments)', async () => {
    const ctx = build();
    const at = new Date('2026-07-15T09:00:00Z');
    await ctx.service.apply(SCOPE, [bucket(DOMAIN.SALES, { [METRIC.NET_REVENUE]: 100 })], at);
    await ctx.service.apply(SCOPE, [bucket(DOMAIN.SALES, { [METRIC.NET_REVENUE]: 50 })], at);
    const all = await ctx.buckets.findBucket(SCOPE, DOMAIN.SALES, PERIOD.ALL, 'all');
    expect(all.metrics[METRIC.NET_REVENUE]).toBe(150);
  });

  it('applies entity instructions to a single leaderboard row', async () => {
    const ctx = build();
    await ctx.service.apply(SCOPE, [entity(DOMAIN.PRODUCTS, ENTITY_TYPE.PRODUCT, 'burger', { [METRIC.UNITS_SOLD]: 3 }, 'Burger')], new Date());
    const top = await ctx.entities.topBy(SCOPE, DOMAIN.PRODUCTS, ENTITY_TYPE.PRODUCT, METRIC.UNITS_SOLD);
    expect(top[0]).toMatchObject({ entityId: 'burger', name: 'Burger' });
    expect(top[0].metrics[METRIC.UNITS_SOLD]).toBe(3);
  });

  it('publishes AnalyticsProjectionUpdated', async () => {
    const ctx = build();
    await ctx.service.apply(SCOPE, [bucket(DOMAIN.SALES, { [METRIC.NET_REVENUE]: 1 })], new Date());
    expect(ctx.events.names()).toContain(ANALYTICS_EVENTS.PROJECTION_UPDATED);
  });

  it('no-ops on an empty/invalid scope', async () => {
    const ctx = build();
    const res = await ctx.service.apply({}, [bucket(DOMAIN.SALES, { x: 1 })], new Date());
    expect(res.applied).toBe(0);
  });
});
