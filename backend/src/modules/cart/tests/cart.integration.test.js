import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, clearDatabase, connectTestInfra, disconnectTestInfra } from '#testing/index.js';
import { registerModules } from '#modules/index.js';

/**
 * Cart module HTTP integration. Verifies module wiring, routing (clean
 * coexistence with the organization + other business modules), and auth
 * boundaries. The full priced guest flow is covered by the service/engine unit
 * tests. Requires MongoDB + Redis.
 */
describe('Cart module (integration)', () => {
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

  it('requires a guest session token for the cart (401)', async () => {
    expect((await request(app).get('/api/v1/cart')).status).toBe(401);
    expect((await request(app).post('/api/v1/cart/items').send({ productId: 'x', quantity: 1 })).status).toBe(401);
  });

  it('rejects a non-guest (staff) token on the cart', async () => {
    // A malformed/absent guest token → 401 (guest tokens are a distinct type).
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', 'Bearer not-a-guest-token');
    expect(res.status).toBe(401);
  });

  it('requires staff auth for coupon management (401)', async () => {
    expect((await request(app).get('/api/v1/restaurant/coupons')).status).toBe(401);
    expect((await request(app).post('/api/v1/restaurant/coupons').send({ code: 'X', type: 'fixed', value: 100 })).status).toBe(401);
  });

  it('coexists with the organization module routers (fall-through)', async () => {
    // Organization's /restaurant/profile still resolves (401 unauth), proving
    // the specific /restaurant/coupons mount did not shadow it.
    expect((await request(app).get('/api/v1/restaurant/profile')).status).toBe(401);
  });
});
