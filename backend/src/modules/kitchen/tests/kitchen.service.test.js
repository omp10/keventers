import { beforeEach, describe, expect, it } from 'vitest';

import { KitchenService } from '../services/kitchen.service.js';
import { StationRouterService } from '../services/station-router.service.js';
import { ChefAssignmentService } from '../services/chef-assignment.service.js';
import { KITCHEN_EVENTS } from '../events/kitchen.events.js';
import { KITCHEN_STATUS } from '../constants/kitchen.constants.js';

import {
  FakeQueueRepo,
  STATIONS,
  createFakeEventBus,
  fakeRealtime,
  fakeStore,
  makeOrder,
  noopLock,
  staffTenant,
} from './_helpers.js';

function build(order = makeOrder()) {
  const queue = new FakeQueueRepo();
  const events = createFakeEventBus();
  const service = new KitchenService({
    queue,
    stations: { findActiveForBranch: async () => STATIONS, countScoped: async () => 0 },
    router: new StationRouterService(),
    sla: { resolveTarget: async () => 480, isBreached: () => false },
    chefs: new ChefAssignmentService(),
    realtime: fakeRealtime,
    store: fakeStore,
    orders: { getByIdSystem: async () => order },
    resolveScope: async () => ({ organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' }),
    lock: noopLock,
    eventBus: events,
  });
  return { service, queue, events, tenant: staffTenant() };
}

describe('KitchenService — enqueue from order', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('creates a PENDING entry, routes stations, sets SLA target + emits queued', async () => {
    const entry = await ctx.service.enqueueFromOrder('order-1');
    expect(entry.status).toBe(KITCHEN_STATUS.PENDING);
    expect(entry.orderNumber).toBe('KEV-DIN-20260715-000001');
    expect(entry.items[0].stationIds).toEqual(['grill']);
    expect(entry.stationIds).toEqual(['grill']);
    expect(entry.sla.targetSeconds).toBe(480);
    expect(ctx.events.names()).toContain(KITCHEN_EVENTS.ORDER_QUEUED);
  });

  it('is idempotent (one entry per order)', async () => {
    const first = await ctx.service.enqueueFromOrder('order-1');
    const second = await ctx.service.enqueueFromOrder('order-1');
    expect(second.id).toBe(first.id);
    expect(ctx.queue.docs.size).toBe(1);
  });
});

describe('KitchenService — workflow', () => {
  let ctx;
  beforeEach(async () => {
    ctx = build();
    await ctx.service.enqueueFromOrder('order-1');
  });

  it('assigns a chef (PENDING → ASSIGNED)', async () => {
    const assigned = await ctx.service.assign(ctx.tenant, 'order-1', { chefId: '5f1111111111111111111111' });
    expect(assigned.status).toBe(KITCHEN_STATUS.ASSIGNED);
    expect(assigned.assignment.currentChefId).toBe('5f1111111111111111111111');
    expect(ctx.events.names()).toContain(KITCHEN_EVENTS.ORDER_ASSIGNED);
  });

  it('walks assigned → preparing → ready → served', async () => {
    await ctx.service.assign(ctx.tenant, 'order-1', { chefId: '5f1111111111111111111111' });
    const preparing = await ctx.service.startPreparing(ctx.tenant, 'order-1', 'staff-1');
    expect(preparing.status).toBe(KITCHEN_STATUS.PREPARING);
    expect(preparing.timers.preparingAt).toBeTruthy();
    const ready = await ctx.service.markReady(ctx.tenant, 'order-1', 'staff-1');
    expect(ready.status).toBe(KITCHEN_STATUS.READY);
    const served = await ctx.service.markServed(ctx.tenant, 'order-1', 'staff-1');
    expect(served.status).toBe(KITCHEN_STATUS.SERVED);
    expect(ctx.events.names()).toContain(KITCHEN_EVENTS.ORDER_SERVED);
  });

  it('rejects an illegal transition (PENDING → ready)', async () => {
    await expect(ctx.service.markReady(ctx.tenant, 'order-1', 'staff-1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('recalls (PREPARING → RECALLED) then re-prepares', async () => {
    await ctx.service.assign(ctx.tenant, 'order-1', { chefId: '5f1111111111111111111111' });
    await ctx.service.startPreparing(ctx.tenant, 'order-1', 'staff-1');
    const recalled = await ctx.service.recall(ctx.tenant, 'order-1', { reason: 'wrong item' }, 'staff-1');
    expect(recalled.status).toBe(KITCHEN_STATUS.RECALLED);
    expect(recalled.recallCount).toBe(1);
    const reprep = await ctx.service.startPreparing(ctx.tenant, 'order-1', 'staff-1');
    expect(reprep.status).toBe(KITCHEN_STATUS.PREPARING);
  });

  it('returns 409 on a version conflict', async () => {
    ctx.queue.transitionWithVersion = async () => null;
    await expect(ctx.service.assign(ctx.tenant, 'order-1', { chefId: '5f1111111111111111111111' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('blocks cross-tenant access (403)', async () => {
    const other = staffTenant('restaurant_manager', 'orgX', 'restX');
    await expect(ctx.service.getEntry(other, 'order-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('cancels the entry when the order is cancelled', async () => {
    const res = await ctx.service.cancelFromOrder('order-1', 'order_cancelled');
    expect(res.status).toBe(KITCHEN_STATUS.CANCELLED);
    expect(ctx.events.names()).toContain(KITCHEN_EVENTS.ORDER_CANCELLED);
  });
});
