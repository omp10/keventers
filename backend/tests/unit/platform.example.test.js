import { describe, it, expect, beforeEach } from 'vitest';

import { buildFilter } from '#core/repository/query/filtering.js';
import { buildSort } from '#core/repository/query/sorting.js';
import { policyEvaluator } from '#platform/auth/rbac/policy.js';
import { roleRegistry } from '#platform/auth/rbac/roles.js';
import { MockRepository } from '#testing/index.js';

/**
 * Example suite demonstrating the Phase 3 testing foundation. Runs with
 * `npm test` once dependencies are installed. Uses the MockRepository double so
 * no MongoDB is required.
 */
describe('repository query helpers', () => {
  it('maps operator-suffixed criteria to a Mongo filter', () => {
    expect(buildFilter({ price__gte: '100', status__in: 'a,b' })).toEqual({
      price: { $gte: 100 },
      status: { $in: ['a', 'b'] },
    });
  });

  it('parses a sort string, honoring the allow-list', () => {
    expect(buildSort('createdAt:desc,name:asc')).toEqual({ createdAt: -1, name: 1 });
    expect(buildSort('secret', { allowedFields: ['name'] })).toEqual({ createdAt: -1 });
  });
});

describe('RBAC policy', () => {
  beforeEach(() => {
    roleRegistry.define('editor', ['catalog:read', 'catalog:write']);
  });

  it('grants and denies based on effective permissions', () => {
    const editor = { authenticated: true, roles: ['editor'], permissions: [] };
    expect(policyEvaluator.can(editor, 'catalog:read')).toBe(true);
    expect(policyEvaluator.can(editor, 'catalog:delete')).toBe(false);
  });

  it('super_admin wildcard grants everything', () => {
    const admin = { authenticated: true, roles: ['super_admin'], permissions: [] };
    expect(policyEvaluator.can(admin, 'anything:here')).toBe(true);
  });
});

describe('MockRepository', () => {
  let repo;
  beforeEach(() => {
    repo = new MockRepository({ softDelete: true });
  });

  it('hides soft-deleted documents', async () => {
    const doc = await repo.create({ name: 'A' });
    await repo.create({ name: 'B' });
    await repo.softDeleteById(doc._id);
    expect(await repo.count()).toBe(1);
  });
});
