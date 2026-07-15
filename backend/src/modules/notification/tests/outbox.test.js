import { beforeEach, describe, expect, it } from 'vitest';

import { OutboxService } from '../services/outbox.service.js';
import { OUTBOX_STATUS } from '../constants/notification.constants.js';

import { SCOPE, FakeOutboxRepo, NOTIFY_CONFIG, createFakeEventBus, fakeStore, seenStore } from './_helpers.js';

function request(over = {}) {
  return {
    scope: SCOPE,
    eventName: 'order.ready',
    templateKey: 'order_ready',
    category: 'order_updates',
    priority: 'high',
    audience: 'customer',
    channels: ['inapp', 'push'],
    recipient: { userId: 'user-1' },
    variables: { orderNumber: 'KEV-1' },
    dedupeKey: 'dedupe-abc',
    ...over,
  };
}

function build({ materialize } = {}) {
  const outbox = new FakeOutboxRepo();
  const scheduled = [];
  const notifications = { calls: [], async materializeFromOutbox(row) { this.calls.push(row); if (materialize) return materialize(row); return []; } };
  const scheduleDispatch = async (id, opts) => { scheduled.push({ id, opts }); };
  const events = createFakeEventBus();
  const service = new OutboxService({ outbox, notifications, store: fakeStore, scheduleDispatch, deliveryConfig: NOTIFY_CONFIG.delivery, redisConfig: NOTIFY_CONFIG.redis, eventBus: events });
  return { service, outbox, notifications, scheduled };
}

describe('OutboxService — enqueueFromEvent (transactional outbox)', () => {
  let ctx;
  beforeEach(() => { ctx = build(); });

  it('persists a PENDING outbox row and schedules dispatch', async () => {
    const row = await ctx.service.enqueueFromEvent(request());
    expect(row.status).toBe(OUTBOX_STATUS.PENDING);
    expect(ctx.outbox.docs.size).toBe(1);
    expect(ctx.scheduled).toHaveLength(1);
  });

  it('is idempotent by dedupeKey — a replayed event returns the same row', async () => {
    const first = await ctx.service.enqueueFromEvent(request());
    const second = await ctx.service.enqueueFromEvent(request());
    expect(second.id).toBe(first.id);
    expect(ctx.outbox.docs.size).toBe(1);
  });

  it('short-circuits on a Redis dedupe hit (replay) without inserting', async () => {
    const outbox = new FakeOutboxRepo();
    await outbox.createScoped(SCOPE, { ...request(), status: 'pending' });
    const svc = new OutboxService({ outbox, notifications: { async materializeFromOutbox() {} }, store: seenStore(), scheduleDispatch: async () => {}, deliveryConfig: NOTIFY_CONFIG.delivery, redisConfig: NOTIFY_CONFIG.redis, eventBus: createFakeEventBus() });
    const row = await svc.enqueueFromEvent(request());
    expect(row).toBeTruthy();
    expect(outbox.docs.size).toBe(1); // no duplicate insert
  });
});

describe('OutboxService — dispatch', () => {
  it('claims a PENDING row, materializes notifications, and marks it DISPATCHED', async () => {
    const ctx = build();
    const row = await ctx.service.enqueueFromEvent(request());
    const res = await ctx.service.dispatch(row.id);
    expect(res.dispatched).toBe(true);
    expect(ctx.notifications.calls).toHaveLength(1);
    expect((await ctx.outbox.findById(row.id)).status).toBe(OUTBOX_STATUS.DISPATCHED);
  });

  it('skips a row that is not claimable (already processing/dispatched)', async () => {
    const ctx = build();
    const row = await ctx.service.enqueueFromEvent(request());
    await ctx.service.dispatch(row.id);
    const again = await ctx.service.dispatch(row.id);
    expect(again.skipped).toBe('not_claimable');
    expect(ctx.notifications.calls).toHaveLength(1); // not materialized twice
  });

  it('reschedules with backoff on a transient failure', async () => {
    const ctx = build({ materialize: () => { throw new Error('boom'); } });
    const row = await ctx.service.enqueueFromEvent(request());
    await expect(ctx.service.dispatch(row.id)).rejects.toThrow('boom');
    const after = await ctx.outbox.findById(row.id);
    expect(after.status).toBe(OUTBOX_STATUS.PENDING); // rescheduled for retry
    expect(after.nextAttemptAt).toBeTruthy();
  });

  it('dead-letters after exhausting attempts', async () => {
    const ctx = build({ materialize: () => { throw new Error('permanent'); } });
    const row = await ctx.service.enqueueFromEvent(request());
    // Pre-age attempts so the claim increment reaches the max on this dispatch.
    ctx.outbox.docs.get(row.id).attempts = NOTIFY_CONFIG.delivery.maxAttempts - 1;
    const res = await ctx.service.dispatch(row.id); // claim → attempts === max → DEAD
    expect(res.dead).toBe(true);
    expect((await ctx.outbox.findById(row.id)).status).toBe(OUTBOX_STATUS.DEAD);
  });
});
