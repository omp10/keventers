import { beforeEach, describe, expect, it } from 'vitest';

import { ProductService } from '../services/product.service.js';
import { CATALOG_EVENTS } from '../events/catalog.events.js';
import { PRODUCT_STATUS } from '../constants/catalog.constants.js';

import {
  FakeCategoryRepository,
  FakeModifierGroupRepository,
  FakeModifierRepository,
  FakeProductRepository,
  FakeScopedRepository,
  FakeVariantRepository,
  buildTenant,
  createFakeEventBus,
  fakeScopeResolver,
  fakeStorage,
} from './_helpers.js';

const SCOPE = { organizationId: 'org1', restaurantId: 'rest1' };

function build() {
  const categories = new FakeCategoryRepository();
  const products = new FakeProductRepository();
  const variants = new FakeVariantRepository();
  const modifierGroups = new FakeModifierGroupRepository();
  const modifiers = new FakeModifierRepository();
  const addons = new FakeScopedRepository();
  const events = createFakeEventBus();
  const service = new ProductService({
    products,
    categories,
    variants,
    modifierGroups,
    modifiers,
    addons,
    storage: fakeStorage,
    resolveScope: fakeScopeResolver(),
    eventBus: events,
  });
  return { service, categories, products, variants, events, tenant: buildTenant() };
}

describe('ProductService', () => {
  let ctx;
  let mainCategory;
  beforeEach(async () => {
    ctx = build();
    mainCategory = await ctx.categories.createScoped(SCOPE, { name: 'Food', parentId: null });
  });

  it('creates a product and denormalises rootCategoryId to the main category', async () => {
    const dto = await ctx.service.createProduct(ctx.tenant, 'rest1', {
      categoryId: mainCategory._id,
      name: 'Classic Burger',
      basePrice: 199,
    });
    expect(dto.status).toBe(PRODUCT_STATUS.DRAFT);
    expect(dto.rootCategoryId).toBe(String(mainCategory._id));
    expect(dto.hasVariants).toBe(false);
    expect(ctx.events.published.map((e) => e.name)).toContain(CATALOG_EVENTS.PRODUCT_CREATED);
  });

  it('sets rootCategoryId to the parent when placed on a subcategory', async () => {
    const sub = await ctx.categories.createScoped(SCOPE, {
      name: 'Burgers',
      parentId: String(mainCategory._id),
    });
    const dto = await ctx.service.createProduct(ctx.tenant, 'rest1', {
      categoryId: sub._id,
      name: 'Veg Burger',
    });
    expect(dto.categoryId).toBe(String(sub._id));
    expect(dto.rootCategoryId).toBe(String(mainCategory._id));
  });

  it('rejects a duplicate SKU within the restaurant', async () => {
    await ctx.service.createProduct(ctx.tenant, 'rest1', {
      categoryId: mainCategory._id,
      name: 'Fries',
      sku: 'SKU-1',
    });
    await expect(
      ctx.service.createProduct(ctx.tenant, 'rest1', {
        categoryId: mainCategory._id,
        name: 'Large Fries',
        sku: 'SKU-1',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('emits a price-changed event when pricing is updated', async () => {
    const product = await ctx.service.createProduct(ctx.tenant, 'rest1', {
      categoryId: mainCategory._id,
      name: 'Shake',
      basePrice: 100,
    });
    ctx.events.published.length = 0;
    await ctx.service.updateProduct(ctx.tenant, product.id, { pricing: { basePrice: 150 } });
    const names = ctx.events.published.map((e) => e.name);
    expect(names).toContain(CATALOG_EVENTS.PRODUCT_PRICE_CHANGED);
  });
});
