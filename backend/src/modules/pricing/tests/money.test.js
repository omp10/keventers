import { describe, expect, it } from 'vitest';

import { Money } from '../money/money.js';

describe('Money value object (integer minor units)', () => {
  it('rejects non-integer construction (no floating-point money)', () => {
    expect(() => Money.of(10.5)).toThrow();
    expect(() => new Money(1.1)).toThrow();
  });

  it('converts major → minor at the boundary', () => {
    expect(Money.fromMajor(199.5).amount).toBe(19950);
    expect(Money.fromMajor(200).amount).toBe(20000);
    expect(Money.fromMajor(149.99).amount).toBe(14999);
  });

  it('adds / subtracts / multiplies in minor units', () => {
    expect(Money.of(19950).add(Money.of(50)).amount).toBe(20000);
    expect(Money.of(20000).subtract(Money.of(50)).amount).toBe(19950);
    expect(Money.of(19950).multiply(3).amount).toBe(59850);
  });

  it('computes a percentage in basis points with half-up rounding', () => {
    // 18% of ₹100.00 = ₹18.00
    expect(Money.of(10000).percentageBps(1800).amount).toBe(1800);
    // 5% of ₹199.50 = ₹9.975 → 998 (half-up)
    expect(Money.of(19950).percentageBps(500).amount).toBe(998);
  });

  it('is immutable — operations return new instances', () => {
    const a = Money.of(1000);
    const b = a.add(Money.of(500));
    expect(a.amount).toBe(1000);
    expect(b.amount).toBe(1500);
    expect(Object.isFrozen(a)).toBe(true);
  });

  it('throws on currency mismatch', () => {
    expect(() => Money.of(100, 'INR').add(Money.of(100, 'USD'))).toThrow(/mismatch/i);
  });

  it('clamps (never over cap / under floor) and sums', () => {
    expect(Money.of(500).clampMax(Money.of(300)).amount).toBe(300);
    expect(Money.of(100).clampMin(Money.of(300)).amount).toBe(300);
    expect(Money.sum([Money.of(100), Money.of(200), Money.of(50)]).amount).toBe(350);
  });

  it('serializes with the integer amount as the source of truth', () => {
    expect(Money.of(19950, 'INR').toJSON()).toEqual({ amount: 19950, currency: 'INR', major: 199.5 });
  });
});
