import { describe, it, expect, beforeEach } from 'vitest';

import { IdentitySeeder } from '../seeds/identity.seeder.js';
import { buildPermissionCatalog, ROLE_DEFINITIONS } from '../seeds/permission-catalog.js';
import { USER_STATUS, USER_TYPE } from '../constants/identity.constants.js';

import {
  FakeUserRepository,
  FakeRoleRepository,
  FakePermissionRepository,
  fakePasswords,
  createFakeEventBus,
} from './_helpers.js';

function fakeAudit() {
  return { records: [], record(entry) { this.records.push(entry); } };
}

function fakeRbac() {
  return {
    roleRegistry: { defined: [], define(name, perms) { this.defined.push({ name, perms }); } },
    permissionRegistry: { registered: [], register(name) { this.registered.push(name); } },
  };
}

function build(overrides = {}) {
  const permissions = new FakePermissionRepository();
  const roles = new FakeRoleRepository();
  const users = new FakeUserRepository();
  const events = createFakeEventBus();
  const audit = fakeAudit();
  const rbac = fakeRbac();
  const seedConfig = {
    admin: { name: 'Super Admin', email: 'admin@keventers.com', password: 'Secret123', phone: null },
    organization: { enabled: false, name: 'Keventers' },
    ...overrides.seedConfig,
  };
  const seeder = new IdentitySeeder({
    permissions,
    roles,
    users,
    passwords: fakePasswords,
    events,
    audit,
    rbac,
    seedConfig,
  });
  return { seeder, permissions, roles, users, events, audit, rbac };
}

describe('IdentitySeeder', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('seeds the full permission catalog, roles and the Super Admin on first run', async () => {
    const summary = await ctx.seeder.run();

    expect(summary.permissions.created).toBe(buildPermissionCatalog().length);
    expect(summary.roles.created).toBe(ROLE_DEFINITIONS.length);
    expect(summary.admin.created).toBe(true);

    const admin = await ctx.users.findByEmail('admin@keventers.com');
    expect(admin).toBeTruthy();
    expect(admin.roles).toEqual(['super_admin']);
    expect(admin.status).toBe(USER_STATUS.ACTIVE);
    expect(admin.type).toBe(USER_TYPE.STAFF);
    expect(admin.emailVerified).toBe(true);
  });

  it('hashes the admin password via PasswordService (never plain text)', async () => {
    await ctx.seeder.run();
    const admin = await ctx.users.findByEmail('admin@keventers.com');
    expect(admin.passwordHash).toBe('hashed:Secret123');
    expect(admin.passwordHash).not.toBe('Secret123');
  });

  it('assigns the wildcard permission to super_admin and grants to other roles', async () => {
    await ctx.seeder.run();
    const superAdmin = await ctx.roles.findByName('super_admin');
    expect(superAdmin.permissions).toContain('*');
    const cashier = await ctx.roles.findByName('cashier');
    expect(cashier.permissions).toContain('order:*');
  });

  it('publishes creation events and writes audit logs only on first creation', async () => {
    await ctx.seeder.run();
    const eventNames = new Set(ctx.events.published.map((e) => e.name));
    expect(eventNames.has('identity.permission.created')).toBe(true);
    expect(eventNames.has('identity.role.created')).toBe(true);
    expect(eventNames.has('identity.user.created')).toBe(true);

    const auditActions = ctx.audit.records.map((r) => r.action);
    expect(auditActions).toContain('identity.permission.created');
    expect(auditActions).toContain('identity.role.created');
    expect(auditActions).toContain('identity.user.super_admin_created');
  });

  it('registers roles and permissions with the RBAC platform', async () => {
    await ctx.seeder.run();
    const superAdmin = ctx.rbac.roleRegistry.defined.find((r) => r.name === 'super_admin');
    expect(superAdmin.perms).toContain('*');
    expect(ctx.rbac.permissionRegistry.registered).toContain('order:create');
  });

  it('is fully idempotent — a second run creates nothing new', async () => {
    await ctx.seeder.run();
    const usersAfterFirst = ctx.users.docs.size;
    const rolesAfterFirst = ctx.roles.docs.size;
    const permsAfterFirst = ctx.permissions.docs.size;
    const eventsAfterFirst = ctx.events.published.length;

    const summary2 = await ctx.seeder.run();

    expect(summary2.permissions.created).toBe(0);
    expect(summary2.roles.created).toBe(0);
    expect(summary2.admin.created).toBe(false);
    expect(summary2.admin.skipped).toBe(true);

    // No duplicates and no new events on the second run.
    expect(ctx.users.docs.size).toBe(usersAfterFirst);
    expect(ctx.roles.docs.size).toBe(rolesAfterFirst);
    expect(ctx.permissions.docs.size).toBe(permsAfterFirst);
    expect(ctx.events.published.length).toBe(eventsAfterFirst);
  });

  it('validates required admin configuration', async () => {
    const { seeder } = build({ seedConfig: { admin: { name: 'X', email: '', password: '' } } });
    await expect(seeder.run()).rejects.toMatchObject({ statusCode: 422 });
  });

  it('defers default-organization seeding (Organization module not implemented)', async () => {
    const { seeder } = build({
      seedConfig: {
        admin: { name: 'A', email: 'a@b.com', password: 'Secret123' },
        organization: { enabled: true, name: 'Keventers' },
      },
    });
    const summary = await seeder.run();
    expect(summary.organization.status).toBe('deferred');
  });
});
