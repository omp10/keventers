import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, clearDatabase, connectTestInfra, disconnectTestInfra } from '#testing/index.js';
import { registerModules } from '#modules/index.js';

/**
 * Notification module HTTP integration. Verifies module wiring, that the specific
 * `/notifications`, `/restaurant/*`, `/admin/*` mounts coexist with the other
 * business modules (fall-through), and auth boundaries. Delivery/outbox logic is
 * covered by the service unit tests. Requires MongoDB + Redis.
 */
describe('Notification module (integration)', () => {
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

  it('requires a guest session token for customer notification endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/notifications')).status).toBe(401);
    expect((await request(app).patch('/api/v1/notifications/5f1111111111111111111111/read')).status).toBe(401);
    expect((await request(app).get('/api/v1/notifications/preferences')).status).toBe(401);
  });

  it('requires staff auth for restaurant notification endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/restaurant/notifications')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/notification-templates')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/notification-campaigns')).status).toBe(401);
    expect((await request(app).post('/api/v1/restaurant/notifications/test')).status).toBe(401);
  });

  it('requires super admin for admin notification endpoints (401)', async () => {
    expect((await request(app).get('/api/v1/admin/notifications')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/notification-campaigns')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/notification-outbox')).status).toBe(401);
  });

  it('coexists with the organization + other module routers (fall-through)', async () => {
    expect((await request(app).get('/api/v1/restaurant/profile')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/customers')).status).toBe(401);
    expect((await request(app).get('/api/v1/restaurant/payments')).status).toBe(401);
  });
});
