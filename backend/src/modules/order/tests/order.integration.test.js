import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, clearDatabase, connectTestInfra, disconnectTestInfra } from '#testing/index.js';
import { registerModules } from '#modules/index.js';

/**
 * Order module HTTP integration. Verifies module wiring, routing (clean
 * coexistence with the organization + other business modules) and auth
 * boundaries. The full checkout/state-machine flow is covered by the service +
 * state-machine unit tests. Requires MongoDB + Redis.
 */
describe('Order module (integration)', () => {
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

  it('requires a guest session token for customer orders (401)', async () => {
    expect((await request(app).post('/api/v1/orders')).status).toBe(401);
    expect((await request(app).get('/api/v1/orders')).status).toBe(401);
  });

  it('requires staff auth for restaurant orders (401)', async () => {
    expect((await request(app).get('/api/v1/restaurant/orders')).status).toBe(401);
    expect((await request(app).post('/api/v1/restaurant/orders/5f1111111111111111111111/confirm')).status).toBe(401);
  });

  it('requires super admin for admin orders (401)', async () => {
    expect((await request(app).get('/api/v1/admin/orders')).status).toBe(401);
  });

  it('coexists with the organization + other module routers (fall-through)', async () => {
    // Organization's /restaurant/profile still resolves (401 unauth), proving the
    // specific /restaurant/orders mount did not shadow it.
    expect((await request(app).get('/api/v1/restaurant/profile')).status).toBe(401);
    // Cart's /cart still resolves (401 unauth) — modules coexist.
    expect((await request(app).get('/api/v1/cart')).status).toBe(401);
  });
});
