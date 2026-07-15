import { describe, it, expect, beforeEach } from 'vitest';

import { UserService } from '../services/user.service.js';
import { USER_STATUS } from '../constants/identity.constants.js';

import {
  FakeUserRepository,
  FakeRoleRepository,
  FakePermissionRepository,
  fakePasswords,
  createFakeSessions,
  createFakeEventBus,
} from './_helpers.js';

/**
 * UserService unit tests — pure business logic with all dependencies mocked.
 * No MongoDB, Redis, or bcrypt required.
 */
describe('UserService', () => {
  let users;
  let roles;
  let permissions;
  let sessions;
  let events;
  let service;

  beforeEach(() => {
    users = new FakeUserRepository();
    roles = new FakeRoleRepository();
    permissions = new FakePermissionRepository();
    sessions = createFakeSessions();
    events = createFakeEventBus();
    service = new UserService({ users, roles, permissions, passwords: fakePasswords, sessions, eventBus: events });
  });

  const baseUser = {
    email: 'a@b.com',
    password: 'Password1',
    firstName: 'Ada',
  };

  it('creates a user, hashes the password, and publishes UserCreated', async () => {
    const dto = await service.createUser(baseUser);
    expect(dto.email).toBe('a@b.com');
    expect(dto).not.toHaveProperty('passwordHash');
    const stored = await users.findByEmail('a@b.com');
    expect(stored.passwordHash).toBe('hashed:Password1');
    expect(events.published.map((e) => e.name)).toContain('identity.user.created');
  });

  it('rejects a duplicate email with 409', async () => {
    await service.createUser(baseUser);
    await expect(service.createUser(baseUser)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('validates that assigned roles exist', async () => {
    const created = await service.createUser(baseUser);
    await expect(service.assignRoles(created.id, ['ghost'])).rejects.toMatchObject({ statusCode: 422 });
  });

  it('assigns roles and revokes sessions', async () => {
    await roles.create({ name: 'admin', permissions: [] });
    const created = await service.createUser(baseUser);
    const dto = await service.assignRoles(created.id, ['admin']);
    expect(dto.roles).toContain('admin');
    expect(sessions.calls.revokeAll).toContain(created.id);
    expect(events.published.map((e) => e.name)).toContain('identity.user.role_assigned');
  });

  it('disables a user and revokes their sessions', async () => {
    const created = await service.createUser(baseUser);
    const dto = await service.disableUser(created.id);
    expect(dto.status).toBe(USER_STATUS.DISABLED);
    expect(sessions.calls.revokeAll).toContain(created.id);
  });

  it('rejects password change when the current password is wrong', async () => {
    const created = await service.createUser(baseUser);
    await expect(service.changePassword(created.id, 'WRONG', 'NewPass1')).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('changes the password when the current one matches', async () => {
    const created = await service.createUser(baseUser);
    const res = await service.changePassword(created.id, 'Password1', 'NewPass1');
    expect(res.passwordChanged).toBe(true);
    const stored = await users.findByEmail('a@b.com');
    expect(stored.passwordHash).toBe('hashed:NewPass1');
    expect(sessions.calls.revokeAll).toContain(created.id);
  });

  it('password reset request is silent for unknown emails (no enumeration)', async () => {
    const res = await service.requestPasswordReset('nobody@nowhere.com');
    expect(res).toEqual({ requested: true });
  });
});
