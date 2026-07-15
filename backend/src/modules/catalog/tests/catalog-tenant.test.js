import { describe, expect, it } from 'vitest';

import { assertCatalogAccess, loadOwned } from '../utils/catalog-tenant.util.js';

import { FakeProductRepository, buildTenant } from './_helpers.js';

describe('catalog tenancy', () => {
  it('allows access to an entity in the caller tenant', () => {
    const tenant = buildTenant({ organizationId: 'orgA', restaurantId: 'restA' });
    expect(() =>
      assertCatalogAccess(tenant, { organizationId: 'orgA', restaurantId: 'restA' }),
    ).not.toThrow();
  });

  it('blocks access to another restaurant (403)', () => {
    const tenant = buildTenant({ organizationId: 'orgA', restaurantId: 'restA', role: 'restaurant_manager' });
    expect(() =>
      assertCatalogAccess(tenant, { organizationId: 'orgB', restaurantId: 'restB' }),
    ).toThrow();
  });

  it('super admin bypasses tenant scoping', () => {
    const tenant = buildTenant({ organizationId: 'orgA', restaurantId: 'restA', role: 'super_admin' });
    expect(() =>
      assertCatalogAccess(tenant, { organizationId: 'orgZ', restaurantId: 'restZ' }),
    ).not.toThrow();
  });

  it('loadOwned returns 404 for a missing entity and 403 across tenants', async () => {
    const repo = new FakeProductRepository();
    const owned = await repo.createScoped(
      { organizationId: 'orgA', restaurantId: 'restA' },
      { name: 'Item' },
    );
    const tenantA = buildTenant({ organizationId: 'orgA', restaurantId: 'restA' });
    const tenantB = buildTenant({ organizationId: 'orgB', restaurantId: 'restB', role: 'restaurant_manager' });

    await expect(loadOwned(repo, tenantA, 'missing', 'not found')).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(loadOwned(repo, tenantB, owned._id, 'not found')).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(loadOwned(repo, tenantA, owned._id, 'not found')).resolves.toMatchObject({
      name: 'Item',
    });
  });
});
