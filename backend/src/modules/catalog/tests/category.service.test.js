import { beforeEach, describe, expect, it } from 'vitest';

import { CategoryService } from '../services/category.service.js';
import { CATALOG_EVENTS } from '../events/catalog.events.js';

import {
  FakeCategoryRepository,
  FakeProductRepository,
  buildTenant,
  createFakeEventBus,
  fakeScopeResolver,
} from './_helpers.js';

function build() {
  const categories = new FakeCategoryRepository();
  const products = new FakeProductRepository();
  const events = createFakeEventBus();
  const service = new CategoryService({
    categories,
    products,
    resolveScope: fakeScopeResolver(),
    eventBus: events,
  });
  return { service, categories, products, events, tenant: buildTenant() };
}

describe('CategoryService (single model, max depth 2)', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('creates a MAIN category (parentId null, depth 0)', async () => {
    const dto = await ctx.service.createCategory(ctx.tenant, 'rest1', { name: 'Beverages' });
    expect(dto.parentId).toBeNull();
    expect(dto.depth).toBe(0);
    expect(dto.isSubcategory).toBe(false);
    expect(ctx.events.published.map((e) => e.name)).toContain(CATALOG_EVENTS.CATEGORY_CREATED);
  });

  it('creates a SUBCATEGORY under a main category (depth 1)', async () => {
    const main = await ctx.service.createCategory(ctx.tenant, 'rest1', { name: 'Beverages' });
    const sub = await ctx.service.createCategory(ctx.tenant, 'rest1', {
      name: 'Milkshakes',
      parentId: main.id,
    });
    expect(sub.parentId).toBe(main.id);
    expect(sub.depth).toBe(1);
    expect(sub.isSubcategory).toBe(true);
  });

  it('rejects a THIRD level (subcategory used as a parent → depth 2 max)', async () => {
    const main = await ctx.service.createCategory(ctx.tenant, 'rest1', { name: 'Beverages' });
    const sub = await ctx.service.createCategory(ctx.tenant, 'rest1', {
      name: 'Milkshakes',
      parentId: main.id,
    });
    await expect(
      ctx.service.createCategory(ctx.tenant, 'rest1', { name: 'Thick Shakes', parentId: sub.id }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('blocks deleting a category that still has products', async () => {
    const main = await ctx.service.createCategory(ctx.tenant, 'rest1', { name: 'Food' });
    await ctx.products.createScoped(
      { organizationId: 'org1', restaurantId: 'rest1' },
      { name: 'Burger', categoryId: main.id },
    );
    await expect(ctx.service.deleteCategory(ctx.tenant, main.id)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('blocks cross-tenant access (403)', async () => {
    const main = await ctx.service.createCategory(ctx.tenant, 'rest1', { name: 'Food' });
    const otherTenant = buildTenant({ organizationId: 'orgX', restaurantId: 'restX' });
    await expect(ctx.service.getCategory(otherTenant, main.id)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
