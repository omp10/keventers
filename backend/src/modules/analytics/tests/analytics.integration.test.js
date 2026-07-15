import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, clearDatabase, connectTestInfra, disconnectTestInfra } from '#testing/index.js';
import { registerModules } from '#modules/index.js';

/**
 * Analytics module HTTP integration. Verifies module wiring, that the specific
 * `/restaurant/analytics/*` + `/admin/analytics/*` mounts coexist with the other
 * business modules (fall-through), and auth boundaries. Projection/dashboard logic
 * is covered by the service unit tests. Requires MongoDB + Redis.
 */
describe('Analytics module (integration)', () => {
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

  it('requires staff auth for restaurant analytics endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/restaurant/analytics/dashboard')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/analytics/sales')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/analytics/products')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/analytics/kitchen')).status).toBe(401);
    expect((await request(app).post('/api/v1/restaurant/analytics/rebuild')).status).toBe(401);
  });

  it('requires super admin for platform analytics endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/admin/analytics/platform')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/analytics/revenue')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/analytics/providers')).status).toBe(401);
  });

  it('coexists with the organization + other module routers (fall-through)', async () => {
    expect((await request(app).get('/api/v1/restaurant/profile')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/notifications')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/customers')).status).toBe(401);
  });
});
