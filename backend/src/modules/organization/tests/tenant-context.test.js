import { describe, it, expect } from 'vitest';

import {
  buildTenantContext,
  assertOrganizationAccess,
  assertRestaurantAccess,
} from '../utils/tenant-context.js';

/**
 * Pure tenancy-logic tests — the heart of cross-tenant isolation.
 */
describe('tenant-context', () => {
  it('flags super admins and does not scope them', () => {
    const t = buildTenantContext({ principal: { id: 'u1', roles: ['super_admin'] }, memberships: [] });
    expect(t.isSuperAdmin).toBe(true);
    expect(() => assertOrganizationAccess(t, 'any-org')).not.toThrow();
  });

  it('builds org/restaurant scope from memberships', () => {
    const t = buildTenantContext({
      principal: { id: 'u1', roles: ['organization_admin'] },
      memberships: [
        { organizationId: 'orgA', restaurantId: 'restA', isOwner: true },
        { organizationId: 'orgA', restaurantId: 'restB' },
      ],
    });
    expect(t.isSuperAdmin).toBe(false);
    expect(t.organizationIds).toEqual(['orgA']);
    expect(new Set(t.restaurantIds)).toEqual(new Set(['restA', 'restB']));
    expect(t.primaryOrganizationId).toBe('orgA');
    expect(t.primaryRestaurantId).toBe('restA');
  });

  it('blocks cross-organization access', () => {
    const t = buildTenantContext({
      principal: { id: 'u1', roles: ['organization_admin'] },
      memberships: [{ organizationId: 'orgA', restaurantId: 'restA' }],
    });
    expect(() => assertOrganizationAccess(t, 'orgA')).not.toThrow();
    expect(() => assertOrganizationAccess(t, 'orgB')).toThrow(/not allowed/i);
  });

  it('blocks access to a restaurant in another organization', () => {
    const t = buildTenantContext({
      principal: { id: 'u1', roles: ['restaurant_manager'] },
      memberships: [{ organizationId: 'orgA', restaurantId: 'restA' }],
    });
    expect(() => assertRestaurantAccess(t, { id: 'restA', organizationId: 'orgA' })).not.toThrow();
    expect(() => assertRestaurantAccess(t, { id: 'restZ', organizationId: 'orgB' })).toThrow();
  });
});
