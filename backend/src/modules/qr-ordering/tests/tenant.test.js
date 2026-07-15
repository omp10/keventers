import { describe, expect, it } from 'vitest';

import { assertQrAccess, loadOwned } from '../utils/tenant.util.js';

import { FakeTableRepo, buildTenant } from './_helpers.js';

describe('QR tenancy', () => {
  it('allows access to an entity in the caller tenant', () => {
    const tenant = buildTenant({ organizationId: 'orgA', restaurantId: 'restA' });
    expect(() => assertQrAccess(tenant, { organizationId: 'orgA', restaurantId: 'restA' })).not.toThrow();
  });

  it('blocks another restaurant (403)', () => {
    const tenant = buildTenant({ organizationId: 'orgA', restaurantId: 'restA', role: 'restaurant_manager' });
    expect(() => assertQrAccess(tenant, { organizationId: 'orgB', restaurantId: 'restB' })).toThrow();
  });

  it('super admin bypasses tenant scoping', () => {
    const tenant = buildTenant({ organizationId: 'orgA', restaurantId: 'restA', role: 'super_admin' });
    expect(() => assertQrAccess(tenant, { organizationId: 'orgZ', restaurantId: 'restZ' })).not.toThrow();
  });

  it('loadOwned returns 404 for missing and 403 across tenants', async () => {
    const repo = new FakeTableRepo();
    const owned = await repo.createScoped({ organizationId: 'orgA', restaurantId: 'restA', branchId: 'brA' }, { number: '1' });
    const tenantA = buildTenant({ organizationId: 'orgA', restaurantId: 'restA' });
    const tenantB = buildTenant({ organizationId: 'orgB', restaurantId: 'restB', role: 'restaurant_manager' });

    await expect(loadOwned(repo, tenantA, 'missing', 'nope')).rejects.toMatchObject({ statusCode: 404 });
    await expect(loadOwned(repo, tenantB, owned._id, 'nope')).rejects.toMatchObject({ statusCode: 403 });
    await expect(loadOwned(repo, tenantA, owned._id, 'nope')).resolves.toMatchObject({ number: '1' });
  });
});
