import { describe, expect, it } from 'vitest';

import { BranchScopedRepository } from '../repositories/branch-scoped.repository.js';

import { FakeTableRepo } from './_helpers.js';

const A = { organizationId: 'orgA', restaurantId: 'restA', branchId: 'brA' };
const B = { organizationId: 'orgA', restaurantId: 'restA', branchId: 'brB' };

describe('BranchScopedRepository.scoped()', () => {
  it('injects org + restaurant + branch into every filter', () => {
    const repo = new BranchScopedRepository({ modelName: 'Stub' });
    expect(repo.scoped(A, { status: 'available' })).toEqual({
      status: 'available',
      organizationId: 'orgA',
      restaurantId: 'restA',
      branchId: 'brA',
    });
  });

  it('omits branchId when the scope has none (restaurant-level listing)', () => {
    const repo = new BranchScopedRepository({ modelName: 'Stub' });
    expect(repo.scoped({ organizationId: 'o', restaurantId: 'r' }, {})).toEqual({
      organizationId: 'o',
      restaurantId: 'r',
    });
  });
});

describe('branch scoping isolates branches (in-memory double)', () => {
  it('a scoped lookup never crosses a branch boundary', async () => {
    const repo = new FakeTableRepo();
    const a = await repo.createScoped(A, { number: 'A1' });
    await repo.createScoped(B, { number: 'B1' });

    expect(await repo.findByIdScoped(A, a._id)).toMatchObject({ number: 'A1' });
    expect(await repo.findByIdScoped(B, a._id)).toBeNull();

    const pageA = await repo.paginateScoped(A, {});
    expect(pageA.items).toHaveLength(1);
    expect(pageA.items[0].number).toBe('A1');
  });
});
