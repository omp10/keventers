import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, clearDatabase, connectTestInfra, disconnectTestInfra } from '#testing/index.js';
import { registerModules } from '#modules/index.js';

/**
 * Kitchen (KDS) HTTP integration. Verifies module wiring, routing (clean
 * coexistence with the organization + other business modules) and auth
 * boundaries. The event-driven enqueue + workflow are covered by the service +
 * state-machine unit tests. Requires MongoDB + Redis.
 */
describe('Kitchen module (integration)', () => {
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

  it('requires staff auth for the kitchen console (401)', async () => {
    expect((await request(app).get('/api/v1/restaurant/kitchen/queue')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/kitchen/stations')).status).toBe(401);
    expect((await request(app).patch('/api/v1/restaurant/kitchen/orders/5f1111111111111111111111/ready')).status).toBe(401);
  });

  it('requires super admin for the admin kitchen view (401)', async () => {
    expect((await request(app).get('/api/v1/admin/kitchen')).status).toBe(401);
  });

  it('coexists with the organization + order module routers (fall-through)', async () => {
    // Organization's /restaurant/profile still resolves (401 unauth).
    expect((await request(app).get('/api/v1/restaurant/profile')).status).toBe(401);
    // Order's /restaurant/orders still resolves (401 unauth) — modules coexist.
    expect((await request(app).get('/api/v1/restaurant/orders')).status).toBe(401);
  });
});
