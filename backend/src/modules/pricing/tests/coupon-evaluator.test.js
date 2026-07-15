import { describe, expect, it } from 'vitest';

import { CouponEvaluator } from '../engine/coupon.evaluator.js';
import { COUPON_REJECTION, COUPON_TYPE } from '../constants/pricing.constants.js';
import { Money } from '../money/money.js';

const evaluator = new CouponEvaluator();
const ctx = (over = {}) => ({
  currency: 'INR',
  subtotal: Money.of(50000),
  items: [
    { productId: 'p1', unitPrice: Money.of(20000), quantity: 2 },
    { productId: 'p2', unitPrice: Money.of(10000), quantity: 1 },
  ],
  now: new Date('2026-07-15T12:00:00Z'),
  ...over,
});

describe('CouponEvaluator', () => {
  it('applies a percentage coupon capped at maxDiscount', () => {
    const v = evaluator.evaluate(
      { type: COUPON_TYPE.PERCENTAGE, value: 2000, maxDiscount: 8000, status: 'active' }, // 20%, cap ₹80
      ctx(),
    );
    expect(v.applied).toBe(true);
    expect(v.discount.amount).toBe(8000); // 20% of 50000 = 10000, capped to 8000
  });

  it('applies a fixed coupon', () => {
    const v = evaluator.evaluate({ type: COUPON_TYPE.FIXED, value: 12000, status: 'active' }, ctx());
    expect(v.discount.amount).toBe(12000);
  });

  it('rejects an expired coupon', () => {
    const v = evaluator.evaluate(
      { type: COUPON_TYPE.FIXED, value: 5000, status: 'active', validUntil: '2026-07-01T00:00:00Z' },
      ctx(),
    );
    expect(v.applied).toBe(false);
    expect(v.reason).toBe(COUPON_REJECTION.EXPIRED);
  });

  it('rejects when usage limit reached', () => {
    const v = evaluator.evaluate(
      { type: COUPON_TYPE.FIXED, value: 5000, status: 'active', usageLimit: 10, usageCount: 10 },
      ctx(),
    );
    expect(v.reason).toBe(COUPON_REJECTION.USAGE_LIMIT);
  });

  it('rejects below minimum subtotal', () => {
    const v = evaluator.evaluate(
      { type: COUPON_TYPE.FIXED, value: 5000, status: 'active', minSubtotal: 100000 },
      ctx(),
    );
    expect(v.reason).toBe(COUPON_REJECTION.MIN_SUBTOTAL);
  });

  it('free-item discounts the cheapest eligible unit', () => {
    const v = evaluator.evaluate({ type: COUPON_TYPE.FREE_ITEM, status: 'active' }, ctx());
    expect(v.applied).toBe(true);
    expect(v.discount.amount).toBe(10000); // cheapest unit (p2)
    expect(v.freeItems).toEqual([{ productId: 'p2', quantity: 1 }]);
  });

  it('buy-x-get-y frees Y units per (X+Y) set of the target product', () => {
    const v = evaluator.evaluate(
      { type: COUPON_TYPE.BUY_X_GET_Y, status: 'active', targetProductId: 'p1', buyQuantity: 1, getQuantity: 1 },
      ctx({
        subtotal: Money.of(80000),
        items: [{ productId: 'p1', unitPrice: Money.of(20000), quantity: 4 }],
      }),
    );
    // 4 units, (1+1) per set → 2 sets → 2 free units × 20000 = 40000
    expect(v.applied).toBe(true);
    expect(v.discount.amount).toBe(40000);
  });

  it('rejects a currency mismatch', () => {
    const v = evaluator.evaluate({ type: COUPON_TYPE.FIXED, value: 5000, status: 'active', currency: 'USD' }, ctx());
    expect(v.reason).toBe(COUPON_REJECTION.CURRENCY_MISMATCH);
  });
});
