import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { connectTestInfra, disconnectTestInfra, clearDatabase } from '#testing/index.js';

import { IdentitySeeder } from '../seeds/identity.seeder.js';
import { buildPermissionCatalog, ROLE_DEFINITIONS } from '../seeds/permission-catalog.js';
import { permissionRepository } from '../repositories/permission.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { authService } from '../services/auth.service.js';

/**
 * Seeder integration tests — real MongoDB + Redis + bcrypt.
 * Requires infra: `docker compose up mongo redis`.
 */
const ADMIN = { name: 'Platform Super Admin', email: 'seed-admin@keventers.test', password: 'SeedPass123' };

function makeSeeder() {
  return new IdentitySeeder({
    seedConfig: { admin: ADMIN, organization: { enabled: false, name: 'Keventers' } },
  });
}

describe('IdentitySeeder (integration)', () => {
  beforeAll(async () => {
    await connectTestInfra();
  });
  beforeEach(async () => {
    await clearDatabase();
  });
  afterAll(async () => {
    await disconnectTestInfra();
  });

  it('produces identical results across multiple executions (idempotent)', async () => {
    const first = await makeSeeder().run();
    expect(first.permissions.created).toBe(buildPermissionCatalog().length);
    expect(first.roles.created).toBe(ROLE_DEFINITIONS.length);
    expect(first.admin.created).toBe(true);

    const second = await makeSeeder().run();
    expect(second.permissions.created).toBe(0);
    expect(second.roles.created).toBe(0);
    expect(second.admin.created).toBe(false);

    // Catalog persisted exactly once.
    expect(await permissionRepository.count()).toBe(buildPermissionCatalog().length);
    expect(await roleRepository.count()).toBe(ROLE_DEFINITIONS.length);
    expect(await userRepository.count({ email: ADMIN.email })).toBe(1);
  });

  it('creates a Super Admin that can authenticate with the correct role', async () => {
    await makeSeeder().run();

    const admin = await userRepository.findByEmail(ADMIN.email);
    expect(admin.roles).toContain('super_admin');
    expect(admin.emailVerified).toBe(true);

    // End-to-end: hashed password verifies and login issues a session.
    const result = await authService.login(ADMIN.email, ADMIN.password);
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.user.email).toBe(ADMIN.email);
  });
});
