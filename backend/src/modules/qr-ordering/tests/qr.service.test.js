import { beforeEach, describe, expect, it } from 'vitest';

import { QrService } from '../services/qr.service.js';
import { QR_EVENTS } from '../events/qr.events.js';
import { parseQrCode, verifyQrSignature } from '../utils/qr-token.util.js';

import {
  FakeQrRepo,
  FakeTableRepo,
  SCOPE,
  buildTenant,
  createFakeEventBus,
  createFakeQrCache,
} from './_helpers.js';

function build() {
  const qrCodes = new FakeQrRepo();
  const tables = new FakeTableRepo();
  const cache = createFakeQrCache();
  const events = createFakeEventBus();
  const images = {
    async generateAndStore() {
      return { imageUrl: 'https://cdn.test/qr.png', imageKey: 'qr-codes/qr.png' };
    },
    async remove() {},
  };
  const service = new QrService({ qrCodes, tables, images, cache, eventBus: events });
  return { service, qrCodes, tables, cache, events, tenant: buildTenant() };
}

async function seedTable(tables, id = 't1') {
  return tables.create({
    _id: id,
    number: '12',
    status: 'available',
    organizationId: SCOPE.organizationId,
    restaurantId: SCOPE.restaurantId,
    branchId: SCOPE.branchId,
  });
}

describe('QrService lifecycle', () => {
  let ctx;
  beforeEach(async () => {
    ctx = build();
    await seedTable(ctx.tables);
  });

  it('generates a signed, verifiable QR bound to a table', async () => {
    const qr = await ctx.service.generateForTable(ctx.tenant, 't1', {}, 'admin-1');
    expect(qr.tableId).toBe('t1');
    expect(qr.status).toBe('active');
    expect(qr.imageUrl).toBeTruthy();
    const parsed = parseQrCode(qr.code);
    expect(verifyQrSignature(parsed.token, parsed.secretVersion, parsed.signature)).toBe(true);
    expect(ctx.events.names()).toContain(QR_EVENTS.QR_GENERATED);
  });

  it('regenerate mints a NEW token (old code stops resolving)', async () => {
    const first = await ctx.service.generateForTable(ctx.tenant, 't1', {}, 'admin-1');
    const firstToken = parseQrCode(first.code).token;
    const regen = await ctx.service.regenerate(ctx.tenant, first.id, 'admin-1');
    const newToken = parseQrCode(regen.code).token;
    expect(newToken).not.toBe(firstToken);
    expect(ctx.events.names()).toContain(QR_EVENTS.QR_REGENERATED);
  });

  it('rotate keeps the token but bumps the version (old signatures rejected)', async () => {
    const qr = await ctx.service.generateForTable(ctx.tenant, 't1', {}, 'admin-1');
    const before = parseQrCode(qr.code);
    const rotated = await ctx.service.rotateSecret(ctx.tenant, qr.id, 'admin-1');
    const after = parseQrCode(rotated.code);
    expect(after.token).toBe(before.token);
    expect(after.secretVersion).toBe(before.secretVersion + 1);
    expect(verifyQrSignature(before.token, after.secretVersion, before.signature)).toBe(false);
    expect(ctx.events.names()).toContain(QR_EVENTS.QR_ROTATED);
  });

  it('disable deactivates the QR and invalidates its cache', async () => {
    const qr = await ctx.service.generateForTable(ctx.tenant, 't1', {}, 'admin-1');
    const token = parseQrCode(qr.code).token;
    ctx.cache.map.set(token, { status: 'active' });
    const disabled = await ctx.service.disable(ctx.tenant, qr.id, 'admin-1');
    expect(disabled.status).toBe('inactive');
    expect(ctx.cache.map.has(token)).toBe(false);
    expect(ctx.events.names()).toContain(QR_EVENTS.QR_DISABLED);
  });

  it('never leaks a signing secret in the DTO', async () => {
    const qr = await ctx.service.generateForTable(ctx.tenant, 't1', {}, 'admin-1');
    expect(qr).not.toHaveProperty('secret');
  });

  it('blocks generating a QR for another tenant\'s table (403)', async () => {
    const other = buildTenant({ organizationId: 'orgX', restaurantId: 'restX', role: 'restaurant_manager' });
    await expect(ctx.service.generateForTable(other, 't1', {}, 'x')).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
