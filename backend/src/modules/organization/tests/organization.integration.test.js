import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { buildTestApp, connectTestInfra, disconnectTestInfra, clearDatabase } from '#testing/index.js';
import { registerModules } from '#modules/index.js';
import { IdentitySeeder } from '#modules/identity/seeds/identity.seeder.js';

/**
 * End-to-end onboarding flow. Requires MongoDB + Redis (`docker compose up mongo redis`).
 */
const ADMIN = { name: 'Super Admin', email: 'org-admin@keventers.test', password: 'SeedPass123' };

describe('Organization onboarding (integration)', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    await connectTestInfra();
    await clearDatabase();
    registerModules();
    app = buildTestApp();

    // Seed roles/permissions + a platform super admin, then log in.
    await new IdentitySeeder({ seedConfig: { admin: ADMIN, organization: { enabled: false } } }).run();
    const login = await request(app)
      .post('/api/v1/identity/auth/login')
      .send({ email: ADMIN.email, password: ADMIN.password });
    adminToken = login.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await disconnectTestInfra();
  });

  it('rejects registration with an invalid payload (422)', async () => {
    const res = await request(app).post('/api/v1/public/register-restaurant').field('email', 'bad');
    expect(res.status).toBe(422);
  });

  it('requires super admin for the admin onboarding routes (401)', async () => {
    const res = await request(app).get('/api/v1/admin/onboarding/applications');
    expect(res.status).toBe(401);
  });

  it('registers publicly then provisions the tenant on approval', async () => {
    const reg = await request(app)
      .post('/api/v1/public/register-restaurant')
      .field('restaurantName', 'Keventers CP')
      .field('brandName', 'Keventers')
      .field('ownerName', 'Asha Rao')
      .field('email', 'cp-owner@keventers.test')
      .field('phone', '9999999999')
      .field('city', 'Delhi')
      .field('state', 'Delhi')
      .field('pincode', '110001')
      .field('restaurantType', 'qsr');
    expect(reg.status).toBe(201);
    expect(reg.body.data.status).toBe('pending');
    const applicationId = reg.body.data.id;

    const approve = await request(app)
      .post(`/api/v1/admin/onboarding/${applicationId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(approve.status).toBe(201);
    expect(approve.body.data.organization.id).toBeTruthy();
    expect(approve.body.data.restaurant.status).toBe('onboarding');
    expect(approve.body.data.branch.isPrimary).toBe(true);

    // The organization is now visible to the super admin.
    const list = await request(app)
      .get('/api/v1/admin/organizations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });
});
