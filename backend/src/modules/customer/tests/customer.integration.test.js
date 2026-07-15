import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, clearDatabase, connectTestInfra, disconnectTestInfra } from '#testing/index.js';
import { registerModules } from '#modules/index.js';

/**
 * Customer Platform HTTP integration. Verifies module wiring, that the specific
 * `/customer`, `/restaurant/*`, `/admin/*` mounts coexist with the organization +
 * payment modules (fall-through), and auth boundaries. The loyalty/merge/analytics
 * logic is covered by the service unit tests. Requires MongoDB + Redis.
 */
describe('Customer module (integration)', () => {
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

  it('requires a guest session token for customer endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/customer/profile')).status).toBe(401);
    expect((await request(app).get('/api/v1/customer/loyalty')).status).toBe(401);
    expect((await request(app).post('/api/v1/customer/redeem')).status).toBe(401);
    expect((await request(app).get('/api/v1/customer/rewards')).status).toBe(401);
  });

  it('requires staff auth for restaurant customer/loyalty/reward endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/restaurant/customers')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/loyalty')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/rewards')).status).toBe(401);
  });

  it('requires super admin for admin endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/admin/customers')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/loyalty')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/rewards')).status).toBe(401);
  });

  it('coexists with the organization + payment routers (fall-through)', async () => {
    // Organization's broad /restaurant/profile still resolves (401 unauth) — the
    // specific /restaurant/customers mount did not shadow it.
    expect((await request(app).get('/api/v1/restaurant/profile')).status).toBe(401);
    // Payment's /restaurant/payments still resolves — modules coexist.
    expect((await request(app).get('/api/v1/restaurant/payments')).status).toBe(401);
  });
});
