import { describe, expect, it } from 'vitest';

import { TaxCalculator } from '../engine/tax.calculator.js';
import { TAX_MODE } from '../constants/pricing.constants.js';
import { Money } from '../money/money.js';

const calc = new TaxCalculator();

describe('TaxCalculator', () => {
  it('sums multiple exclusive rates (CGST + SGST)', () => {
    const r = calc.compute(Money.of(10000), {
      mode: TAX_MODE.EXCLUSIVE,
      rates: [{ name: 'CGST', bps: 900 }, { name: 'SGST', bps: 900 }],
    });
    expect(r.lines.map((l) => l.amount.amount)).toEqual([900, 900]);
    expect(r.total.amount).toBe(1800);
  });

  it('extracts an inclusive rate from a gross amount', () => {
    const r = calc.compute(Money.of(11800), {
      mode: TAX_MODE.INCLUSIVE,
      rates: [{ name: 'GST', bps: 1800 }],
    });
    expect(r.total.amount).toBe(1800); // 11800 * 1800 / 11800
  });

  it('ignores zero/blank rates', () => {
    const r = calc.compute(Money.of(10000), { mode: TAX_MODE.EXCLUSIVE, rates: [{ name: 'x', bps: 0 }] });
    expect(r.total.amount).toBe(0);
  });
});
