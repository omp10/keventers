import { beforeEach, describe, expect, it } from 'vitest';

import { ScanService } from '../services/scan.service.js';
import { QR_EVENTS } from '../events/qr.events.js';
import { generateQrCredential } from '../utils/qr-token.util.js';

import {
  FakeQrRepo,
  FakeTableRepo,
  createFakeEventBus,
  createFakeQrCache,
} from './_helpers.js';

const NOW = new Date('2026-07-15T12:00:00Z'); // Wednesday noon UTC

function restaurantOk() {
  return {
    getPublicProfile: async () => ({
      id: 'rest1',
      name: 'Keventers',
      slug: 'keventers',
      type: 'qsr',
      status: 'active',
      settings: {
        currency: 'INR',
        timezone: 'UTC',
        tax: { enabled: true, rates: [] },
        branding: { logoUrl: 'logo' },
        theme: { primaryColor: '#000' },
        orderPreferences: { dineIn: true },
      },
    }),
  };
}

function branchOk(businessHours = []) {
  return {
    getPublicById: async () => ({
      id: 'br1',
      name: 'CP',
      status: 'active',
      address: { city: 'Delhi' },
      businessHours,
      settings: { timezone: 'UTC' },
    }),
  };
}

async function seedQr(qrCodes, tables, { status = 'active', expiresAt = null } = {}) {
  const cred = generateQrCredential(1);
  await qrCodes.create({
    _id: 'qr1',
    token: cred.token,
    secretVersion: 1,
    code: cred.code,
    status,
    type: 'permanent',
    tableId: 't1',
    organizationId: 'org1',
    restaurantId: 'rest1',
    branchId: 'br1',
    expiresAt,
  });
  await tables.create({
    _id: 't1',
    number: '12',
    seatingCapacity: 4,
    status: 'available',
    isOrderingEnabled: true,
    isReserved: false,
    organizationId: 'org1',
    restaurantId: 'rest1',
    branchId: 'br1',
  });
  return cred;
}

function build({ branch = branchOk(), restaurants = restaurantOk() } = {}) {
  const qrCodes = new FakeQrRepo();
  const tables = new FakeTableRepo();
  const cache = createFakeQrCache();
  const events = createFakeEventBus();
  const sessions = {
    created: [],
    async createSession(args) {
      this.created.push(args);
      return {
        session: {
          sessionId: 's1',
          guestId: 'g1',
          customerUserId: args.customerUserId ?? null,
          identityType: args.customerUserId ? 'registered' : 'anonymous',
          organizationId: args.scope.organizationId,
          restaurantId: args.scope.restaurantId,
          branchId: args.scope.branchId,
          tableId: args.tableId,
          status: 'active',
          guestName: '',
          expiresAt: new Date(NOW.getTime() + 7200000),
          lastActivityAt: NOW,
          createdAt: NOW,
        },
        recoveryCode: 'rec1',
      };
    },
  };
  const guestToken = { issue: () => 'guest.jwt.token' };
  const catalog = { getPublicActiveMenu: async () => ({ id: 'menu1', name: 'Lunch' }) };
  const service = new ScanService({
    qrCodes,
    tables,
    cache,
    sessions,
    guestToken,
    restaurants,
    branches: branch,
    catalog,
    eventBus: events,
  });
  return { service, qrCodes, tables, cache, sessions, events };
}

describe('ScanService (QR scan flow)', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('completes the full flow → session + guest token + context', async () => {
    const cred = await seedQr(ctx.qrCodes, ctx.tables);
    const result = await ctx.service.scan(cred.code, { now: NOW });

    expect(result.session.sessionId).toBe('s1');
    expect(result.guestToken).toBe('guest.jwt.token');
    expect(result.recoveryCode).toBe('rec1');
    expect(result.context.currency).toBe('INR');
    expect(result.context.activeMenu).toMatchObject({ id: 'menu1' });
    expect(result.context.table).toMatchObject({ number: '12' });
    expect(ctx.events.names()).toContain(QR_EVENTS.QR_SCANNED);
    // The QR validation record was cached for the next scan.
    expect(ctx.cache.map.has(cred.token)).toBe(true);
  });

  it('rejects a tampered code (403)', async () => {
    const cred = await seedQr(ctx.qrCodes, ctx.tables);
    const tampered = `${cred.code}X`;
    await expect(ctx.service.scan(tampered, { now: NOW })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects an inactive QR (403)', async () => {
    const cred = await seedQr(ctx.qrCodes, ctx.tables, { status: 'inactive' });
    await expect(ctx.service.scan(cred.code, { now: NOW })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects an expired QR (403)', async () => {
    const cred = await seedQr(ctx.qrCodes, ctx.tables, {
      expiresAt: new Date('2020-01-01T00:00:00Z'),
    });
    await expect(ctx.service.scan(cred.code, { now: NOW })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects an unknown code (404)', async () => {
    const cred = generateQrCredential(1); // never seeded
    await expect(ctx.service.scan(cred.code, { now: NOW })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects when the branch is closed (403)', async () => {
    const closedCtx = build({ branch: branchOk([{ day: 'wednesday', isOpen: false, open: '09:00', close: '10:00' }]) });
    const cred = await seedQr(closedCtx.qrCodes, closedCtx.tables);
    await expect(closedCtx.service.scan(cred.code, { now: NOW })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a table that is out of service (403)', async () => {
    const cred = generateQrCredential(1);
    await ctx.qrCodes.create({
      _id: 'qr1', token: cred.token, secretVersion: 1, code: cred.code, status: 'active',
      type: 'permanent', tableId: 't1', organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1', expiresAt: null,
    });
    await ctx.tables.create({
      _id: 't1', number: '9', status: 'out_of_service', isOrderingEnabled: true, isReserved: false,
      organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1',
    });
    await expect(ctx.service.scan(cred.code, { now: NOW })).rejects.toMatchObject({ statusCode: 403 });
  });
});
