import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp, clearDatabase, connectTestInfra, disconnectTestInfra } from '#testing/index.js';
import { registerModules } from '#modules/index.js';
import { IdentitySeeder } from '#modules/identity/seeds/identity.seeder.js';

/**
 * QR Ordering HTTP integration. Verifies module wiring, routing (clean
 * coexistence with the organization module's /public, /restaurant, /admin
 * routers), auth boundaries, public-scan validation and super-admin inspection.
 * Requires MongoDB + Redis (`docker compose up mongo redis`).
 */
const ADMIN = { name: 'Super Admin', email: 'qr-admin@keventers.test', password: 'SeedPass123' };

describe('QR Ordering module (integration)', () => {
  let app;
  let adminToken;
  let restaurantId;
  let branchId;

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

    const reg = await request(app)
      .post('/api/v1/public/register-restaurant')
      .field('restaurantName', 'Keventers QR Test')
      .field('brandName', 'Keventers')
      .field('ownerName', 'Asha Rao')
      .field('email', 'qr-owner@keventers.test')
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
    branchId = approve.body.data.branch.id;
  });

  afterAll(async () => {
    await disconnectTestInfra();
  });

  it('requires authentication for restaurant table routes (401)', async () => {
    const res = await request(app).get('/api/v1/restaurant/tables');
    expect(res.status).toBe(401);
  });

  it('requires super admin for admin routes (401 unauth)', async () => {
    const res = await request(app).get('/api/v1/admin/tables');
    expect(res.status).toBe(401);
  });

  it('coexists with the organization module routers (fall-through)', async () => {
    // Organization's /restaurant/profile still resolves (401 unauth).
    expect((await request(app).get('/api/v1/restaurant/profile')).status).toBe(401);
    // QR's /restaurant/qr resolves to this module (401 unauth).
    expect((await request(app).get('/api/v1/restaurant/sessions')).status).toBe(401);
  });

  it('rejects a malformed QR code on public scan (400)', async () => {
    const res = await request(app)
      .post('/api/v1/public/qr/scan')
      .send({ code: 'not-a-valid-qr-code-string' });
    expect(res.status).toBe(400);
  });

  it('rejects a too-short scan payload with validation error (422)', async () => {
    const res = await request(app).post('/api/v1/public/qr/scan').send({ code: 'x' });
    expect(res.status).toBe(422);
  });

  it('lets a super admin inspect a branch\'s (empty) table list', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/tables?restaurantId=${restaurantId}&branchId=${branchId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBe(0);
  });
});
