import { beforeEach, describe, expect, it } from 'vitest';

import { DeliveryService } from '../services/delivery.service.js';
import { NOTIFICATION_EVENTS } from '../events/notification.events.js';
import { CHANNEL, DELIVERY_STATUS, NOTIFICATION_STATUS } from '../constants/notification.constants.js';

import { SCOPE, FakeAttemptRepo, FakeNotificationRepo, createFakeEventBus, fakeRealtime, fakeStore } from './_helpers.js';

async function seedNotification(repo, over = {}) {
  return repo.createScoped(SCOPE, {
    channel: CHANNEL.PUSH,
    category: 'order_updates',
    templateKey: 'order_ready',
    subject: 'Ready',
    body: 'Order KEV-1 is ready',
    destination: 'device-token',
    status: NOTIFICATION_STATUS.QUEUED,
    dedupeKey: `d-${Math.random()}`,
    ...over,
  });
}

function build({ send, deadLetter } = {}) {
  const notifications = new FakeNotificationRepo();
  const attempts = new FakeAttemptRepo();
  const dispatcher = { calls: [], async send(channel, message) { this.calls.push({ channel, message }); return send ? send(channel, message) : { success: true, providerMessageId: 'pm-1', provider: 'fcm' }; } };
  const events = createFakeEventBus();
  const dl = deadLetter ?? (async () => {});
  const service = new DeliveryService({ notifications, attempts, dispatcher, realtime: fakeRealtime, store: fakeStore, deadLetter: dl, maxAttempts: 3, lockTtlMs: 1000, eventBus: events });
  return { service, notifications, attempts, dispatcher, events };
}

describe('DeliveryService — success', () => {
  let ctx;
  beforeEach(() => { ctx = build(); });

  it('sends an external notification via the dispatcher and records the attempt + SENT', async () => {
    const n = await seedNotification(ctx.notifications);
    const res = await ctx.service.process(n.id, { attemptsMade: 0 });
    expect(res.status).toBe(NOTIFICATION_STATUS.SENT);
    expect(ctx.dispatcher.calls[0].channel).toBe(CHANNEL.PUSH);
    expect(ctx.attempts.byStatus(DELIVERY_STATUS.SUCCESS)).toHaveLength(1);
    expect(ctx.events.names()).toContain(NOTIFICATION_EVENTS.SENT);
  });

  it('marks an in-app notification DELIVERED and emits realtime', async () => {
    const n = await seedNotification(ctx.notifications, { channel: CHANNEL.IN_APP, destination: null });
    const res = await ctx.service.process(n.id, { attemptsMade: 0 });
    expect(res.status).toBe(NOTIFICATION_STATUS.DELIVERED);
    expect(ctx.events.names()).toContain(NOTIFICATION_EVENTS.DELIVERED);
  });

  it('skips a notification already in a terminal state (idempotent)', async () => {
    const n = await seedNotification(ctx.notifications, { status: NOTIFICATION_STATUS.DELIVERED });
    const res = await ctx.service.process(n.id, { attemptsMade: 0 });
    expect(res.skipped).toBe(NOTIFICATION_STATUS.DELIVERED);
    expect(ctx.dispatcher.calls).toHaveLength(0);
  });
});

describe('DeliveryService — failure / retry / dead-letter', () => {
  it('throws on a transient failure (before the final attempt) so BullMQ retries', async () => {
    const ctx = build({ send: () => ({ success: false, error: 'provider_5xx' }) });
    const n = await seedNotification(ctx.notifications);
    await expect(ctx.service.process(n.id, { attemptsMade: 0 })).rejects.toThrow(/retry/);
    expect(ctx.attempts.byStatus(DELIVERY_STATUS.FAILED)).toHaveLength(1);
  });

  it('marks FAILED + dead-letters on the final attempt', async () => {
    const dead = [];
    const ctx = build({ send: () => ({ success: false, error: 'provider_5xx' }), deadLetter: async (p) => dead.push(p) });
    const n = await seedNotification(ctx.notifications);
    const res = await ctx.service.process(n.id, { attemptsMade: 2 }); // final (maxAttempts=3)
    expect(res.deadLettered).toBe(true);
    expect((await ctx.notifications.findById(n.id)).status).toBe(NOTIFICATION_STATUS.FAILED);
    expect(dead).toHaveLength(1);
    expect(ctx.events.names()).toContain(NOTIFICATION_EVENTS.FAILED);
  });
});
