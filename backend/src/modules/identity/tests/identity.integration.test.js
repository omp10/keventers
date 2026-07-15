import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import {
  buildTestApp,
  connectTestInfra,
  disconnectTestInfra,
  clearDatabase,
} from '#testing/index.js';

import { registerModules } from '#modules/index.js';

/**
 * HTTP integration tests for the Identity module.
 *
 * Requires a running MongoDB + Redis (e.g. `docker compose up mongo redis`).
 * Exercises the real middleware pipeline, validation, services, repositories,
 * and the platform auth/session stack end-to-end.
 */
const BASE = '/api/v1/identity';

describe('Identity module (integration)', () => {
  let app;

  beforeAll(async () => {
    await connectTestInfra();
    registerModules();
    app = buildTestApp();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectTestInfra();
  });

  const newUser = {
    email: 'integration@keventers.test',
    password: 'Password1',
    firstName: 'Inty',
  };

  it('registers, logs in, and returns the current user', async () => {
    const reg = await request(app).post(`${BASE}/auth/register`).send(newUser);
    expect(reg.status).toBe(201);
    expect(reg.body.success).toBe(true);
    expect(reg.body.data.tokens.accessToken).toBeTruthy();
    expect(reg.body.data.user).not.toHaveProperty('passwordHash');

    const login = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email: newUser.email, password: newUser.password });
    expect(login.status).toBe(200);
    const token = login.body.data.tokens.accessToken;

    const me = await request(app).get(`${BASE}/auth/me`).set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(newUser.email);
  });

  it('rejects invalid registration payloads with 422', async () => {
    const res = await request(app).post(`${BASE}/auth/register`).send({ email: 'nope' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication for user administration', async () => {
    const res = await request(app).get(`${BASE}/users`);
    expect(res.status).toBe(401);
  });

  it('rejects duplicate email registration with 409', async () => {
    await request(app).post(`${BASE}/auth/register`).send(newUser);
    const dupe = await request(app).post(`${BASE}/auth/register`).send(newUser);
    expect(dupe.status).toBe(409);
  });
});
