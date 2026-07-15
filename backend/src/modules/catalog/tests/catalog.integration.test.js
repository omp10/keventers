import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, clearDatabase, connectTestInfra, disconnectTestInfra } from '#testing/index.js';
import { registerModules } from '#modules/index.js';
import { IdentitySeeder } from '#modules/identity/seeds/identity.seeder.js';

/**
 * Catalog module HTTP integration. Verifies module wiring, routing (including
 * clean fall-through/coexistence with the organization module's /restaurant and
 * /admin routers), auth boundaries and super-admin catalog inspection.
 * Requires MongoDB + Redis (`docker compose up mongo redis`).
 */
const ADMIN = { name: 'Super Admin', email: 'cat-admin@keventers.test', password: 'SeedPass123' };

describe('Catalog module (integration)', () => {
  let app;
  let adminToken;
  let restaurantId;

  beforeAll(async () => {
    await connectTestInfra();
    await clearDatabase();
    registerModules();
    app = buildTestApp();

    await new IdentitySeeder({ seedConfig: { admin: ADMIN, organization: { enabled: false } } }).run();
    const login = await request(app)
      .post('/api/v1/identity/auth/login')
      .send({ email: ADMIN.email, password: ADMIN.password });
    adminToken = login.body.data.tokens.accessToken;

    // Provision a restaurant via the public onboarding → approval flow.
    const reg = await request(app)
      .post('/api/v1/public/register-restaurant')
      .field('restaurantName', 'Keventers Catalog Test')
      .field('brandName', 'Keventers')
      .field('ownerName', 'Asha Rao')
      .field('email', 'cat-owner@keventers.test')
      .field('phone', '9999999999')
      .field('city', 'Delhi')
      .field('state', 'Delhi')
      .field('pincode', '110001')
      .field('restaurantType', 'qsr');
    const approve = await request(app)
      .post(`/api/v1/admin/onboarding/${reg.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    restaurantId = approve.body.data.restaurant.id;
  });

  afterAll(async () => {
    await disconnectTestInfra();
  });

  it('requires authentication for restaurant catalog routes (401)', async () => {
    const res = await request(app).get('/api/v1/restaurant/menus');
    expect(res.status).toBe(401);
  });

  it('mounts catalog routes without shadowing the organization module', async () => {
    // Organization's /restaurant/profile still resolves (falls through), 401 unauth.
    const org = await request(app).get('/api/v1/restaurant/profile');
    expect(org.status).toBe(401);
    // Catalog's /restaurant/products resolves to the catalog module, 401 unauth.
    const cat = await request(app).get('/api/v1/restaurant/products');
    expect(cat.status).toBe(401);
  });

  it('requires super admin for admin catalog inspection (401 unauth)', async () => {
    const res = await request(app).get('/api/v1/admin/catalog/stats');
    expect(res.status).toBe(401);
  });

  it('returns an empty catalog snapshot for a freshly provisioned restaurant', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/catalog/stats?restaurantId=${restaurantId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toMatchObject({ menus: 0, products: 0, categories: 0 });
  });
});
