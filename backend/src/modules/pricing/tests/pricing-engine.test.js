import { describe, expect, it } from 'vitest';

import { PricingEngine } from '../engine/pricing-engine.js';
import {
  COUPON_TYPE,
  DISCOUNT_SCOPE,
  DISCOUNT_TYPE,
  SERVICE_CHARGE_TYPE,
  TAX_MODE,
} from '../constants/pricing.constants.js';

const engine = new PricingEngine();
const item = (over = {}) => ({ reference: 'i1', productId: 'p1', quantity: 1, components: { base: 0 }, ...over });

describe('PricingEngine — accuracy (integer minor units)', () => {
  it('composes a line from base + variant + modifiers + addons', () => {
    const b = engine.calculate({
      currency: 'INR',
      items: [item({ components: { base: 10000, variant: 2000, modifiers: [500, 300], addons: [1500] } })],
    });
    expect(b.items[0].unitPrice.amount).toBe(14300);
    expect(b.subtotal.amount).toBe(14300);
  });

  it('multiplies line by quantity', () => {
    const b = engine.calculate({ currency: 'INR', items: [item({ quantity: 2, components: { base: 20000 } })] });
    expect(b.subtotal.amount).toBe(40000);
  });

  it('adds exclusive GST on top', () => {
    const b = engine.calculate({
      currency: 'INR',
      items: [item({ quantity: 2, components: { base: 20000 } })],
      tax: { mode: TAX_MODE.EXCLUSIVE, rates: [{ name: 'GST', bps: 500 }] },
    });
    expect(b.subtotal.amount).toBe(40000);
    expect(b.tax.total.amount).toBe(2000);
    expect(b.total.amount).toBe(42000);
  });

  it('extracts inclusive tax without changing the total', () => {
    const b = engine.calculate({
      currency: 'INR',
      items: [item({ components: { base: 21000 } })],
      tax: { mode: TAX_MODE.INCLUSIVE, rates: [{ name: 'GST', bps: 500 }] },
    });
    expect(b.total.amount).toBe(21000);
    expect(b.tax.total.amount).toBe(1000); // embedded portion
  });

  it('applies a percentage service charge and taxes it (exclusive)', () => {
    const b = engine.calculate({
      currency: 'INR',
      items: [item({ components: { base: 100000 } })],
      serviceCharge: { type: SERVICE_CHARGE_TYPE.PERCENTAGE, value: 1000 }, // 10%
      tax: { mode: TAX_MODE.EXCLUSIVE, rates: [{ name: 'GST', bps: 500 }], taxServiceCharge: true },
    });
    expect(b.serviceCharge.amount).toBe(10000);
    expect(b.tax.total.amount).toBe(5500); // 5% of 110000
    expect(b.total.amount).toBe(115500);
  });

  it('applies cascading restaurant discount before tax', () => {
    const b = engine.calculate({
      currency: 'INR',
      items: [item({ components: { base: 50000 } })],
      discounts: [{ scope: DISCOUNT_SCOPE.RESTAURANT, type: DISCOUNT_TYPE.PERCENTAGE, value: 1000 }],
      tax: { mode: TAX_MODE.EXCLUSIVE, rates: [{ name: 'GST', bps: 500 }] },
    });
    expect(b.discounts.restaurant.amount).toBe(5000);
    expect(b.discountedSubtotal.amount).toBe(45000);
    expect(b.total.amount).toBe(47250);
  });

  it('applies a fixed coupon (validated in-engine) capped at the subtotal', () => {
    const b = engine.calculate({
      currency: 'INR',
      items: [item({ components: { base: 40000 } })],
      coupon: { type: COUPON_TYPE.FIXED, value: 10000, currency: 'INR', status: 'active', minSubtotal: 20000 },
    });
    expect(b.discounts.couponApplied).toBe(true);
    expect(b.discounts.coupon.amount).toBe(10000);
    expect(b.discountedSubtotal.amount).toBe(30000);
    expect(b.total.amount).toBe(30000);
  });

  it('rejects a coupon below the minimum subtotal (no discount)', () => {
    const b = engine.calculate({
      currency: 'INR',
      items: [item({ components: { base: 10000 } })],
      coupon: { type: COUPON_TYPE.FIXED, value: 5000, currency: 'INR', status: 'active', minSubtotal: 20000 },
    });
    expect(b.discounts.couponApplied).toBe(false);
    expect(b.discounts.coupon.amount).toBe(0);
    expect(b.total.amount).toBe(10000);
  });

  it('rounds the total to the nearest rupee (100 paise)', () => {
    const b = engine.calculate({
      currency: 'INR',
      items: [item({ components: { base: 42749 } })],
      rounding: { step: 100 },
    });
    expect(b.total.amount).toBe(42700);
    expect(b.roundingAdjustment.amount).toBe(-49);
  });

  it('handles an empty cart as zero', () => {
    const b = engine.calculate({ currency: 'INR', items: [] });
    expect(b.subtotal.amount).toBe(0);
    expect(b.total.amount).toBe(0);
  });
});
