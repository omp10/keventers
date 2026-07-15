import { beforeEach, describe, expect, it } from 'vitest';

import { SessionService } from '../services/session.service.js';
import { SESSION_STATUS } from '../constants/qr.constants.js';
import { QR_EVENTS } from '../events/qr.events.js';

import {
  FakeSessionRepo,
  FakeTableRepo,
  SCOPE,
  createFakeEventBus,
  createFakeOccupancy,
  createFakeSessionStore,
  fakeScopeResolver,
} from './_helpers.js';

function build() {
  const sessions = new FakeSessionRepo();
  const tables = new FakeTableRepo();
  const store = createFakeSessionStore();
  const occupancy = createFakeOccupancy();
  const events = createFakeEventBus();
  const service = new SessionService({
    sessions,
    tables,
    store,
    occupancy,
    sessionConfig: { ttlSeconds: 7200, idleTimeoutSeconds: 1800 },
    resolveScope: fakeScopeResolver(),
    eventBus: events,
  });
  return { service, sessions, tables, store, occupancy, events };
}

const createArgs = { scope: SCOPE, tableId: 't1', qrCodeId: 'qr1', device: { deviceId: 'd1' } };

describe('SessionService lifecycle', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('creates an ACTIVE session, occupies the table and emits events', async () => {
    const { session, recoveryCode } = await ctx.service.createSession(createArgs);
    expect(session.status).toBe(SESSION_STATUS.ACTIVE);
    expect(session.sessionId).toBeTruthy();
    expect(recoveryCode).toBeTruthy();
    expect(ctx.occupancy.occupied).toHaveLength(1);
    expect(await ctx.store.get(session.sessionId)).toBeTruthy();
    expect(ctx.events.names()).toContain(QR_EVENTS.SESSION_CREATED);
    expect(ctx.events.names()).toContain(QR_EVENTS.SESSION_ACTIVATED);
  });

  it('ends a session (COMPLETED), destroys the live snapshot and releases the table', async () => {
    const { session } = await ctx.service.createSession(createArgs);
    const ended = await ctx.service.endSession(session.sessionId);
    expect(ended.status).toBe(SESSION_STATUS.COMPLETED);
    expect(await ctx.store.get(session.sessionId)).toBeNull();
    expect(ctx.occupancy.released).toHaveLength(1);
    expect(ctx.events.names()).toContain(QR_EVENTS.SESSION_COMPLETED);
    expect(ctx.events.names()).toContain(QR_EVENTS.SESSION_ENDED);
  });

  it('is idempotent when ending an already-terminal session', async () => {
    const { session } = await ctx.service.createSession(createArgs);
    await ctx.service.endSession(session.sessionId);
    const again = await ctx.service.endSession(session.sessionId);
    expect(again.status).toBe(SESSION_STATUS.COMPLETED);
  });

  it('rejects an illegal transition (completed → checkout_pending)', async () => {
    const { session } = await ctx.service.createSession(createArgs);
    await ctx.service.endSession(session.sessionId);
    await expect(ctx.service.markCheckoutPending(session.sessionId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('moves ACTIVE → CHECKOUT_PENDING → COMPLETED', async () => {
    const { session } = await ctx.service.createSession(createArgs);
    const pending = await ctx.service.markCheckoutPending(session.sessionId);
    expect(pending.status).toBe(SESSION_STATUS.CHECKOUT_PENDING);
    const done = await ctx.service.endSession(session.sessionId);
    expect(done.status).toBe(SESSION_STATUS.COMPLETED);
  });

  it('recovers a live session and records the new device', async () => {
    const { session } = await ctx.service.createSession(createArgs);
    const { session: recovered } = await ctx.service.recoverSession({
      sessionId: session.sessionId,
      device: { deviceId: 'd2' },
    });
    expect(recovered.sessionId).toBe(session.sessionId);
    expect(recovered.devices.some((d) => d.deviceId === 'd2')).toBe(true);
    expect(ctx.events.names()).toContain(QR_EVENTS.SESSION_RECOVERED);
  });

  it('links a registered account without losing the session', async () => {
    const { session } = await ctx.service.createSession(createArgs);
    const linked = await ctx.service.linkAccount(session.sessionId, 'cust-1');
    expect(linked.identityType).toBe('registered');
    expect(ctx.events.names()).toContain(QR_EVENTS.SESSION_LINKED_ACCOUNT);
  });
});
