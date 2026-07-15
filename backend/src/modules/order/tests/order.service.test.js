import { beforeEach, describe, expect, it } from 'vitest';

import { buildTenantContext } from '#modules/organization/index.js';

import { OrderService } from '../services/order.service.js';
import { ORDER_EVENTS } from '../events/order.events.js';
import { ORDER_STATUS } from '../constants/order.constants.js';

import { GUEST_SCOPE, buildService, makeCart, createFakeCart } from './_helpers.js';

const staff = buildTenantContext({
  principal: { id: 'staff-1', roles: ['restaurant_manager'] },
  memberships: [{ organizationId: 'org1', restaurantId: 'rest1', isOwner: true }],
});

async function walkTo(service, id, statuses) {
  let dto;
  for (const s of statuses) {
    if (s === ORDER_STATUS.CONFIRMED) dto = await service.confirm(staff, id, 'staff-1');
    else if (s === ORDER_STATUS.PREPARING) dto = await service.prepare(staff, id, 'staff-1');
    else if (s === ORDER_STATUS.READY) dto = await service.ready(staff, id, 'staff-1');
    else if (s === ORDER_STATUS.SERVED) dto = await service.serve(staff, id, 'staff-1');
    else if (s === ORDER_STATUS.COMPLETED) dto = await service.complete(staff, id, 'staff-1');
  }
  return dto;
}

describe('OrderService — checkout (cart → order)', () => {
  let ctx;
  beforeEach(() => {
    ctx = buildService(OrderService);
  });

  it('places an order with immutable snapshots + Pricing-Engine pricing', async () => {
    const order = await ctx.service.checkout(GUEST_SCOPE);
    expect(order.status).toBe(ORDER_STATUS.PLACED);
    expect(order.orderNumber).toBe('KEV-DIN-20260715-000001');
    expect(order.items).toHaveLength(1);
    // Pricing is the engine breakdown captured from the locked cart (unchanged).
    expect(order.pricing.total.amount).toBe(42000);
    expect(order.items[0].pricing.unitPrice).toBe(20000);
    // Timeline CREATED → PLACED.
    expect(order.timeline.map((t) => t.newStatus)).toEqual([ORDER_STATUS.CREATED, ORDER_STATUS.PLACED]);
    expect(ctx.carts.converted).toHaveLength(1); // cart converted
    expect(ctx.events.names()).toContain(ORDER_EVENTS.ORDER_CREATED);
    expect(ctx.events.names()).toContain(ORDER_EVENTS.ORDER_PLACED);
  });

  it('is idempotent by cart (a second checkout returns the same order)', async () => {
    const first = await ctx.service.checkout(GUEST_SCOPE);
    const second = await ctx.service.checkout(GUEST_SCOPE);
    expect(second.id).toBe(first.id);
    expect(ctx.orders.docs.size).toBe(1); // NOT two orders
  });

  it('replays a stored result for a repeated Idempotency-Key', async () => {
    const first = await ctx.service.checkout(GUEST_SCOPE, { idempotencyKey: 'k1' });
    const second = await ctx.service.checkout(GUEST_SCOPE, { idempotencyKey: 'k1' });
    expect(second).toEqual(first);
  });

  it('refuses to checkout an empty cart', async () => {
    const ctx2 = buildService(OrderService, { carts: createFakeCart(makeCart({ items: [] })) });
    await expect(ctx2.service.checkout(GUEST_SCOPE)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('OrderService — state machine', () => {
  let ctx;
  let orderId;
  beforeEach(async () => {
    ctx = buildService(OrderService);
    orderId = (await ctx.service.checkout(GUEST_SCOPE)).id;
  });

  it('confirms and requests a kitchen queue entry (event only)', async () => {
    const confirmed = await ctx.service.confirm(staff, orderId, 'staff-1');
    expect(confirmed.status).toBe(ORDER_STATUS.CONFIRMED);
    expect(ctx.events.names()).toContain(ORDER_EVENTS.ORDER_CONFIRMED);
    expect(ctx.events.names()).toContain(ORDER_EVENTS.KITCHEN_QUEUE_REQUESTED);
  });

  it('walks the full happy path to COMPLETED', async () => {
    const done = await walkTo(ctx.service, orderId, [
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY,
      ORDER_STATUS.SERVED,
      ORDER_STATUS.COMPLETED,
    ]);
    expect(done.status).toBe(ORDER_STATUS.COMPLETED);
    expect(done.timeline.length).toBe(7); // CREATED, PLACED + 5 transitions
  });

  it('rejects an illegal transition (PLACED → SERVED)', async () => {
    await expect(ctx.service.serve(staff, orderId, 'staff-1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns 409 on an optimistic version conflict', async () => {
    // Force the conditional write to lose the race.
    ctx.orders.transitionWithVersion = async () => null;
    await expect(ctx.service.confirm(staff, orderId, 'staff-1')).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('OrderService — cancellation & refund', () => {
  let ctx;
  let orderId;
  beforeEach(async () => {
    ctx = buildService(OrderService);
    orderId = (await ctx.service.checkout(GUEST_SCOPE)).id;
  });

  it('lets a customer cancel while PLACED', async () => {
    const cancelled = await ctx.service.cancelByCustomer(GUEST_SCOPE, orderId, { reason: 'changed mind' });
    expect(cancelled.status).toBe(ORDER_STATUS.CANCELLED);
    expect(ctx.events.names()).toContain(ORDER_EVENTS.ORDER_CANCELLED);
  });

  it('forbids customer cancellation once PREPARING', async () => {
    await ctx.service.confirm(staff, orderId, 'staff-1');
    await ctx.service.prepare(staff, orderId, 'staff-1');
    await expect(ctx.service.cancelByCustomer(GUEST_SCOPE, orderId)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('blocks a cross-session customer from accessing the order (403)', async () => {
    const other = { ...GUEST_SCOPE, sessionId: 'other-session' };
    await expect(ctx.service.getForGuest(other, orderId)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('runs the refund extension lifecycle (request → approve → refunded)', async () => {
    await walkTo(ctx.service, orderId, [
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY,
      ORDER_STATUS.SERVED,
      ORDER_STATUS.COMPLETED,
    ]);
    const pending = await ctx.service.requestRefund(staff, orderId, { reason: 'quality' }, 'staff-1');
    expect(pending.status).toBe(ORDER_STATUS.REFUND_PENDING);
    const refunded = await ctx.service.approveRefund(staff, orderId, 'staff-1');
    expect(refunded.status).toBe(ORDER_STATUS.REFUNDED);
    expect(ctx.events.names()).toContain(ORDER_EVENTS.ORDER_REFUND_REQUESTED);
    expect(ctx.events.names()).toContain(ORDER_EVENTS.ORDER_REFUNDED);
  });
});
