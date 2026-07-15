import { DISCOUNT_SCOPE, DISCOUNT_TYPE } from '../constants/pricing.constants.js';
import { Money } from '../money/money.js';

/**
 * Non-coupon discount calculation (product / menu / restaurant level). Each
 * discount applies to the REMAINING discountable amount (cascading, in scope
 * order) and can never push a running total below zero. Coupons are handled
 * separately by the CouponEvaluator so their eligibility rules stay isolated.
 */
export class DiscountCalculator {
  /**
   * @param {Money} subtotal
   * @param {Array<{scope:string,type:string,value:number,maxDiscount?:number}>} discounts
   * @returns {{ byScope: Record<string, Money>, total: Money }}
   */
  compute(subtotal, discounts = []) {
    const currency = subtotal.currency;
    const zero = Money.zero(currency);
    const byScope = {
      [DISCOUNT_SCOPE.PRODUCT]: zero,
      [DISCOUNT_SCOPE.MENU]: zero,
      [DISCOUNT_SCOPE.RESTAURANT]: zero,
    };

    let remaining = subtotal;
    // Deterministic order: product → menu → restaurant.
    const order = [DISCOUNT_SCOPE.PRODUCT, DISCOUNT_SCOPE.MENU, DISCOUNT_SCOPE.RESTAURANT];
    for (const scope of order) {
      for (const d of discounts.filter((x) => x.scope === scope)) {
        if (remaining.isZero() || remaining.isNegative()) break;
        let amount =
          d.type === DISCOUNT_TYPE.PERCENTAGE
            ? remaining.percentageBps(Number(d.value))
            : Money.of(Math.trunc(Number(d.value)), currency);
        if (d.maxDiscount != null) amount = amount.clampMax(Money.of(Math.trunc(d.maxDiscount), currency));
        amount = amount.clampMax(remaining); // never exceed what's left
        byScope[scope] = byScope[scope].add(amount);
        remaining = remaining.subtract(amount);
      }
    }

    const total = Money.sum([byScope[DISCOUNT_SCOPE.PRODUCT], byScope[DISCOUNT_SCOPE.MENU], byScope[DISCOUNT_SCOPE.RESTAURANT]], currency);
    return { byScope, total, remaining };
  }
}

export const discountCalculator = new DiscountCalculator();
export default discountCalculator;
