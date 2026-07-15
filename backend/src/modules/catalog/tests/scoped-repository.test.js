import { describe, expect, it } from 'vitest';

import { CatalogScopedRepository } from '../repositories/catalog-scoped.repository.js';

import { FakeProductRepository } from './_helpers.js';

const SCOPE_A = { organizationId: 'orgA', restaurantId: 'restA' };
const SCOPE_B = { organizationId: 'orgB', restaurantId: 'restB' };

describe('CatalogScopedRepository.scoped()', () => {
  it('injects organizationId + restaurantId into every filter', () => {
    // A minimal model stub — scoped() is pure and never touches the DB.
    const repo = new CatalogScopedRepository({ modelName: 'Stub' });
    const filter = repo.scoped(SCOPE_A, { status: 'active' });
    expect(filter).toEqual({ status: 'active', organizationId: 'orgA', restaurantId: 'restA' });
  });
});

describe('scoped repository behaviour (via in-memory double)', () => {
  it('createScoped stamps the tenant ownership fields', async () => {
    const repo = new FakeProductRepository();
    const doc = await repo.createScoped(SCOPE_A, { name: 'Latte' });
    expect(doc.organizationId).toBe('orgA');
    expect(doc.restaurantId).toBe('restA');
  });

  it('never returns another tenant\'s row from a scoped lookup', async () => {
    const repo = new FakeProductRepository();
    const a = await repo.createScoped(SCOPE_A, { name: 'A' });
    await repo.createScoped(SCOPE_B, { name: 'B' });

    expect(await repo.findByIdScoped(SCOPE_A, a._id)).toMatchObject({ name: 'A' });
    // Same id, wrong tenant → not visible.
    expect(await repo.findByIdScoped(SCOPE_B, a._id)).toBeNull();

    const pageA = await repo.paginateScoped(SCOPE_A, {});
    expect(pageA.items).toHaveLength(1);
    expect(pageA.items[0].name).toBe('A');
  });

  it('countScoped only counts within the scope', async () => {
    const repo = new FakeProductRepository();
    await repo.createScoped(SCOPE_A, { name: 'A1' });
    await repo.createScoped(SCOPE_A, { name: 'A2' });
    await repo.createScoped(SCOPE_B, { name: 'B1' });
    expect(await repo.countScoped(SCOPE_A, {})).toBe(2);
    expect(await repo.countScoped(SCOPE_B, {})).toBe(1);
  });
});
