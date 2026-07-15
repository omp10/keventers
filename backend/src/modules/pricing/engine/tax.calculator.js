import { TAX_MODE } from '../constants/pricing.constants.js';
import { Money } from '../money/money.js';
import { roundHalfUp } from '../money/rounding.js';

/**
 * Tax calculation — always performed here, never by consuming modules. Supports
 * GST-style multi-rate configs in EXCLUSIVE (added on top) or INCLUSIVE (already
 * embedded) mode. All math is integer minor-unit / basis-point.
 */
export class TaxCalculator {
  /**
   * @param {Money} taxableBase  The amount tax applies to.
   * @param {{ mode: string, rates: Array<{name:string,bps:number}> }} taxConfig
   * @returns {{ mode: string, lines: Array<{name:string,bps:number,amount:Money}>, total: Money }}
   */
  compute(taxableBase, taxConfig = {}) {
    const currency = taxableBase.currency;
    const mode = taxConfig.mode ?? TAX_MODE.EXCLUSIVE;
    const rates = Array.isArray(taxConfig.rates) ? taxConfig.rates : [];

    const lines = rates
      .filter((r) => r && Number(r.bps) > 0)
      .map((r) => {
        const bps = Number(r.bps);
        const amount =
          mode === TAX_MODE.INCLUSIVE
            ? this.#extractInclusive(taxableBase, bps)
            : taxableBase.percentageBps(bps);
        return { name: r.name ?? 'Tax', bps, amount };
      });

    const total = Money.sum(
      lines.map((l) => l.amount),
      currency,
    );
    return { mode, lines, total };
  }

  /** Portion of a tax-INCLUSIVE gross amount attributable to a rate. */
  #extractInclusive(gross, bps) {
    // tax = gross * bps / (10000 + bps)
    const amount = roundHalfUp((gross.amount * bps) / (10000 + bps));
    return Money.of(amount, gross.currency);
  }
}

export const taxCalculator = new TaxCalculator();
export default taxCalculator;
