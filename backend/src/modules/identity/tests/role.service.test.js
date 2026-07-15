import { describe, it, expect, beforeEach } from 'vitest';

import { RoleService } from '../services/role.service.js';

import { FakeRoleRepository, FakePermissionRepository, createFakeEventBus } from './_helpers.js';

describe('RoleService', () => {
  let roles;
  let permissions;
  let service;

  beforeEach(() => {
    roles = new FakeRoleRepository();
    permissions = new FakePermissionRepository();
    service = new RoleService({ roles, permissions, eventBus: createFakeEventBus() });
  });

  it('creates a role with existing permissions', async () => {
    await permissions.create({ name: 'identity:user:read' });
    const dto = await service.createRole({ name: 'viewer', permissions: ['identity:user:read'] });
    expect(dto.name).toBe('viewer');
    expect(dto.permissions).toContain('identity:user:read');
  });

  it('rejects a role referencing an unknown permission', async () => {
    await expect(
      service.createRole({ name: 'viewer', permissions: ['does:not:exist'] }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects a duplicate role name', async () => {
    await service.createRole({ name: 'viewer' });
    await expect(service.createRole({ name: 'viewer' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuses to modify a system role', async () => {
    const sys = await roles.create({ name: 'super_admin', isSystem: true });
    await expect(service.updateRole(sys._id, { description: 'x' })).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
