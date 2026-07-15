import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, clearDatabase, connectTestInfra, disconnectTestInfra } from '#testing/index.js';
import { registerModules } from '#modules/index.js';

/**
 * Payment module HTTP integration. Verifies module wiring, the specific
 * `/payments`, `/restaurant/*`, `/admin/*` mounts coexist with the organization
 * module (fall-through), auth boundaries, and that webhook endpoints are
 * unauthenticated (signature-verified inside the service). The financial logic
 * itself is covered by the service + provider unit tests. Requires MongoDB + Redis.
 */
describe('Payment module (integration)', () => {
  let app;

  beforeAll(async () => {
    await connectTestInfra();
    await clearDatabase();
    registerModules();
    app = buildTestApp();
  });

  afterAll(async () => {
    await disconnectTestInfra();
  });

  it('requires a guest session token for customer payments (401)', async () => {
    expect((await request(app).post('/api/v1/payments/create-intent')).status).toBe(401);
    expect((await request(app).post('/api/v1/payments/confirm')).status).toBe(401);
  });

  it('requires staff auth for restaurant payment endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/restaurant/payments')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/transactions')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/refunds')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/invoices')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/payment-config')).status).toBe(401);
  });

  it('requires super admin for admin payment endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/admin/payments')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/settlements')).status).toBe(401);
  });

  it('exposes UNAUTHENTICATED webhook endpoints (not 401 — rejected on signature/payload instead)', async () => {
    const res = await request(app).post('/api/v1/webhooks/razorpay').send({ hello: 'world' });
    expect(res.status).not.toBe(401);
    expect([200, 400, 403]).toContain(res.status);
    const pp = await request(app).post('/api/v1/webhooks/phonepe').send({ hello: 'world' });
    expect(pp.status).not.toBe(401);
  });

  it('coexists with the organization + other module routers (fall-through)', async () => {
    // Organization's broad /restaurant/profile still resolves (401 unauth) — the
    // specific /restaurant/payments mount did not shadow it.
    expect((await request(app).get('/api/v1/restaurant/profile')).status).toBe(401);
    // Order's /restaurant/orders still resolves — modules coexist.
    expect((await request(app).get('/api/v1/restaurant/orders')).status).toBe(401);
  });
});
