import { beforeEach, describe, expect, it } from 'vitest';

import { CartService } from '../services/cart.service.js';
import { cartPricingService } from '../services/cart-pricing.service.js';
import { CART_EVENTS } from '../events/cart.events.js';
import { CART_STATUS } from '../constants/cart.constants.js';

import {
  FakeCartRepo,
  GUEST_SCOPE,
  createFakeEventBus,
  createFakeIdempotency,
  createFakeStore,
  createFakeValidation,
  noopLock,
} from './_helpers.js';

function build(coupon = null) {
  const carts = new FakeCartRepo();
  const cache = createFakeStore();
  const idempotency = createFakeIdempotency();
  const events = createFakeEventBus();
  const coupons = {
    resolveForApply: async () => coupon,
    // The customer-targeting gate (new-customers-only / per-customer cap). The
    // double must offer it or applying ANY coupon throws — these cases cover
    // the pricing maths, not eligibility, so it simply passes.
    assertCustomerEligible: async () => undefined,
    recordRedemption: async () => {},
  };
  const sessions = { markCheckoutPending: async () => {}, getPublicSession: async () => ({ status: 'active' }) };
  const service = new CartService({
    carts,
    cache,
    idempotency,
    lock: noopLock,
    validation: createFakeValidation(),
    pricing: cartPricingService, // real bridge + real Pricing Engine
    coupons,
    sessions,
    cartConfig: { expirationSeconds: 3600, idempotencyTtlSeconds: 86400, lockTtlMs: 5000, maxItems: 100 },
    eventBus: events,
  });
  return { service, carts, cache, idempotency, events };
}

const addInput = { productId: '5f1111111111111111111111', quantity: 2 };

describe('CartService', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('creates an active cart on first add and prices it (server-side)', async () => {
    const cart = await ctx.service.addItem(GUEST_SCOPE, addInput);
    expect(cart.status).toBe(CART_STATUS.ACTIVE);
    expect(cart.items).toHaveLength(1);
    // 2 × ₹200 = ₹400 subtotal; +5% GST = ₹420 total.
    expect(cart.pricing.subtotal.amount).toBe(40000);
    expect(cart.pricing.tax.total.amount).toBe(2000);
    expect(cart.pricing.total.amount).toBe(42000);
    expect(cart.version).toBe(1);
    expect(ctx.events.names()).toContain(CART_EVENTS.CART_ITEM_ADDED);
  });

  it('increments version on each mutation (optimistic concurrency)', async () => {
    await ctx.service.addItem(GUEST_SCOPE, addInput);
    const otherProduct = { ...addInput, productId: '5f2222222222222222222222' };
    const cart = await ctx.service.addItem(GUEST_SCOPE, otherProduct);
    expect(cart.items).toHaveLength(2);
    expect(cart.version).toBe(2);
  });

  it('consolidates duplicate items in the cart', async () => {
    await ctx.service.addItem(GUEST_SCOPE, addInput);
    const cart = await ctx.service.addItem(GUEST_SCOPE, addInput);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(4); // 2 + 2
    expect(cart.version).toBe(2);
  });

  it('rejects a stale version with 409 (concurrent-device safety)', async () => {
    await ctx.service.addItem(GUEST_SCOPE, addInput); // version → 1
    await expect(ctx.service.addItem(GUEST_SCOPE, { ...addInput, version: 0 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('is idempotent for a repeated Idempotency-Key (no double add)', async () => {
    const first = await ctx.service.addItem(GUEST_SCOPE, addInput, { idempotencyKey: 'k-1' });
    const second = await ctx.service.addItem(GUEST_SCOPE, addInput, { idempotencyKey: 'k-1' });
    expect(second).toEqual(first);
    const cart = await ctx.service.getActiveCart(GUEST_SCOPE);
    expect(cart.items).toHaveLength(1); // NOT 2
  });

  it('updates an item quantity and recomputes', async () => {
    const created = await ctx.service.addItem(GUEST_SCOPE, addInput);
    const itemId = created.items[0].id;
    const updated = await ctx.service.updateItem(GUEST_SCOPE, itemId, { quantity: 3 });
    expect(updated.items[0].quantity).toBe(3);
    expect(updated.pricing.subtotal.amount).toBe(60000); // 3 × ₹200
  });

  it('removes an item', async () => {
    const created = await ctx.service.addItem(GUEST_SCOPE, addInput);
    const removed = await ctx.service.removeItem(GUEST_SCOPE, created.items[0].id);
    expect(removed.items).toHaveLength(0);
    expect(removed.pricing.total.amount).toBe(0);
    expect(ctx.events.names()).toContain(CART_EVENTS.CART_ITEM_REMOVED);
  });

  it('locks the cart for checkout (order-conversion boundary)', async () => {
    await ctx.service.addItem(GUEST_SCOPE, addInput);
    const locked = await ctx.service.lockForCheckout(GUEST_SCOPE);
    expect(locked.status).toBe(CART_STATUS.LOCKED);
    expect(ctx.events.names()).toContain(CART_EVENTS.CART_LOCKED);
  });

  it('refuses to lock an empty cart (400)', async () => {
    await ctx.service.getOrCreateCart(GUEST_SCOPE);
    await expect(ctx.service.lockForCheckout(GUEST_SCOPE)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses edits once locked', async () => {
    await ctx.service.addItem(GUEST_SCOPE, addInput);
    await ctx.service.lockForCheckout(GUEST_SCOPE);
    await expect(ctx.service.addItem(GUEST_SCOPE, addInput)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('CartService coupons', () => {
  it('applies a valid fixed coupon and reflects the discount', async () => {
    const ctx = build({
      _id: 'c1', code: 'FLAT100', type: 'fixed', value: 10000, currency: 'INR', status: 'active',
    });
    await ctx.service.addItem(GUEST_SCOPE, addInput); // subtotal 40000
    const cart = await ctx.service.applyCoupon(GUEST_SCOPE, 'FLAT100');
    expect(cart.coupon.code).toBe('FLAT100');
    expect(cart.pricing.discounts.coupon.amount).toBe(10000);
    // (40000 - 10000) + 5% = 31500
    expect(cart.pricing.total.amount).toBe(31500);
  });

  it('rejects a coupon that does not meet its minimum (400)', async () => {
    const ctx = build({
      _id: 'c2', code: 'BIG', type: 'fixed', value: 10000, currency: 'INR', status: 'active', minSubtotal: 100000,
    });
    await ctx.service.addItem(GUEST_SCOPE, addInput);
    await expect(ctx.service.applyCoupon(GUEST_SCOPE, 'BIG')).rejects.toMatchObject({ statusCode: 400 });
  });
});
