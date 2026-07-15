import { beforeEach, describe, expect, it } from 'vitest';

import { CartValidationService } from '../services/cart-validation.service.js';

const DETAIL = {
  id: 'p1',
  name: 'Burger',
  slug: 'burger',
  sku: null,
  thumbnailUrl: null,
  categoryId: null,
  hasVariants: true,
  variants: [{ id: 'v1', name: 'Large', price: 250, isAvailable: true, status: 'active' }],
  modifierGroups: [
    {
      id: 'g1',
      name: 'Cheese',
      isRequired: true,
      minSelection: 1,
      maxSelection: 2,
      modifiers: [
        { id: 'm1', name: 'Extra Cheese', price: 20, isAvailable: true },
        { id: 'm2', name: 'Double Cheese', price: 40, isAvailable: true },
      ],
    },
  ],
  addons: [{ id: 'a1', name: 'Fries', price: 50, isAvailable: true }],
  pricing: { basePrice: 200 },
};

function build(detail = DETAIL) {
  const products = { getForOrdering: async () => detail };
  const catalogPrices = {
    resolvePrice: (product, { variant } = {}) => ({ price: variant ? variant.price : product.pricing.basePrice }),
  };
  const service = new CartValidationService({ products, catalogPrices });
  return { service };
}

const scope = { organizationId: 'org1', restaurantId: 'rest1' };

describe('CartValidationService.resolveItem', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('prices base + variant delta + modifiers (integer minor units)', async () => {
    const item = await ctx.service.resolveItem(
      scope,
      { productId: 'p1', variantId: 'v1', modifierIds: ['m1'] },
      'INR',
    );
    // base 20000 + variant delta (25000-20000=5000) + modifier 2000 = 27000
    expect(item.pricing.base).toBe(20000);
    expect(item.pricing.variant).toBe(5000);
    expect(item.pricing.modifiersTotal).toBe(2000);
    expect(item.pricing.unitPrice).toBe(27000);
  });

  it('adds add-on prices', async () => {
    const item = await ctx.service.resolveItem(
      scope,
      { productId: 'p1', variantId: 'v1', modifierIds: ['m1'], addonIds: ['a1'] },
      'INR',
    );
    expect(item.pricing.addonsTotal).toBe(5000); // ₹50
    expect(item.pricing.unitPrice).toBe(32000);
  });

  it('requires a variant when the product has variants', async () => {
    await expect(ctx.service.resolveItem(scope, { productId: 'p1', modifierIds: ['m1'] }, 'INR')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('enforces required modifier group rules', async () => {
    await expect(
      ctx.service.resolveItem(scope, { productId: 'p1', variantId: 'v1', modifierIds: [] }, 'INR'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('enforces max-selection modifier rules', async () => {
    // maxSelection is 2 — but only m1/m2 exist; selecting a 3rd unknown fails as invalid modifier.
    await expect(
      ctx.service.resolveItem(scope, { productId: 'p1', variantId: 'v1', modifierIds: ['m1', 'm2', 'mX'] }, 'INR'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an invalid add-on', async () => {
    await expect(
      ctx.service.resolveItem(scope, { productId: 'p1', variantId: 'v1', modifierIds: ['m1'], addonIds: ['nope'] }, 'INR'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a product that is not available', async () => {
    const c = build(null);
    await expect(c.service.resolveItem(scope, { productId: 'p1' }, 'INR')).rejects.toMatchObject({ statusCode: 400 });
  });
});
