import { SERVICE_CHARGE_TYPE } from '../constants/pricing.constants.js';
import { Money } from '../money/money.js';

/**
 * Service charge calculation (restaurant-configurable): a fixed minor-unit
 * amount or a percentage (basis points) of a base. Always computed here.
 */
export class ServiceChargeCalculator {
  /**
   * @param {Money} base
   * @param {{ type: string, value: number } | null} config  value = bps (percentage) or minor (fixed).
   * @returns {Money}
   */
  compute(base, config) {
    if (!config || !config.value) return Money.zero(base.currency);
    if (config.type === SERVICE_CHARGE_TYPE.FIXED) {
      return Money.of(Math.trunc(config.value), base.currency);
    }
    // percentage (basis points)
    return base.percentageBps(Number(config.value));
  }
}

export const serviceChargeCalculator = new ServiceChargeCalculator();
export default serviceChargeCalculator;
