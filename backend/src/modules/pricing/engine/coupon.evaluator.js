import {
  COUPON_REJECTION,
  COUPON_STATUS,
  COUPON_TYPE,
} from '../constants/pricing.constants.js';
import { Money } from '../money/money.js';

/**
 * Coupon evaluation — lives INSIDE the pricing engine (per the module contract),
 * so coupon validity + discount math are never duplicated by consuming modules.
 * Pure and deterministic (accepts an explicit `now`). Supports percentage,
 * fixed, free-item and buy-X-get-Y. Returns a structured verdict; the caller
 * decides how to surface a rejection.
 *
 * @typedef {object} CouponContext
 * @property {string} currency
 * @property {Money} subtotal
 * @property {Array<{ productId: string, unitPrice: Money, quantity: number }>} items
 * @property {Date} now
 *
 * @typedef {object} CouponVerdict
 * @property {boolean} applied
 * @property {Money} discount
 * @property {string|null} reason        A COUPON_REJECTION code when not applied.
 * @property {Array<{ productId: string, quantity: number }>} freeItems
 */
export class CouponEvaluator {
  /**
   * @param {object} coupon  Resolved coupon snapshot.
   * @param {CouponContext} ctx
   * @returns {CouponVerdict}
   */
  evaluate(coupon, ctx) {
    const currency = ctx.currency;
    const zero = Money.zero(currency);
    const reject = (reason) => ({ applied: false, discount: zero, reason, freeItems: [] });

    if (!coupon) return reject(COUPON_REJECTION.NOT_FOUND);
    if (coupon.status && coupon.status !== COUPON_STATUS.ACTIVE) return reject(COUPON_REJECTION.INACTIVE);
    if (coupon.currency && coupon.currency !== currency) return reject(COUPON_REJECTION.CURRENCY_MISMATCH);

    const now = ctx.now ?? new Date();
    if (coupon.validFrom && now.getTime() < new Date(coupon.validFrom).getTime()) {
      return reject(COUPON_REJECTION.NOT_STARTED);
    }
    if (coupon.validUntil && now.getTime() > new Date(coupon.validUntil).getTime()) {
      return reject(COUPON_REJECTION.EXPIRED);
    }
    if (coupon.usageLimit != null && (coupon.usageCount ?? 0) >= coupon.usageLimit) {
      return reject(COUPON_REJECTION.USAGE_LIMIT);
    }
    if (coupon.minSubtotal != null && ctx.subtotal.amount < Math.trunc(coupon.minSubtotal)) {
      return reject(COUPON_REJECTION.MIN_SUBTOTAL);
    }

    const cap = (money) => {
      let out = money.clampMax(ctx.subtotal); // never exceed the cart
      if (coupon.maxDiscount != null) out = out.clampMax(Money.of(Math.trunc(coupon.maxDiscount), currency));
      return out.max(zero);
    };

    switch (coupon.type) {
      case COUPON_TYPE.PERCENTAGE:
        return this.#applied(cap(ctx.subtotal.percentageBps(Number(coupon.value))));
      case COUPON_TYPE.FIXED:
        return this.#applied(cap(Money.of(Math.trunc(Number(coupon.value)), currency)));
      case COUPON_TYPE.FREE_ITEM:
        return this.#freeItem(coupon, ctx, cap);
      case COUPON_TYPE.BUY_X_GET_Y:
        return this.#buyXGetY(coupon, ctx, cap);
      default:
        return reject(COUPON_REJECTION.NOT_ELIGIBLE);
    }
  }

  #applied(discount, freeItems = []) {
    return { applied: true, discount, reason: null, freeItems };
  }

  #eligibleItems(coupon, ctx) {
    if (!coupon.targetProductId) return ctx.items;
    return ctx.items.filter((i) => String(i.productId) === String(coupon.targetProductId));
  }

  #freeItem(coupon, ctx, cap) {
    const eligible = this.#eligibleItems(coupon, ctx);
    if (eligible.length === 0) {
      return { applied: false, discount: Money.zero(ctx.currency), reason: COUPON_REJECTION.NOT_ELIGIBLE, freeItems: [] };
    }
    // One free unit of the cheapest eligible item.
    const cheapest = eligible.reduce((min, i) => (i.unitPrice.amount < min.unitPrice.amount ? i : min));
    return this.#applied(cap(cheapest.unitPrice), [{ productId: cheapest.productId, quantity: 1 }]);
  }

  #buyXGetY(coupon, ctx, cap) {
    const buyX = Math.max(1, Math.trunc(coupon.buyQuantity ?? 1));
    const getY = Math.max(1, Math.trunc(coupon.getQuantity ?? 1));
    const eligible = this.#eligibleItems(coupon, ctx);
    const totalQty = eligible.reduce((sum, i) => sum + i.quantity, 0);
    if (totalQty < buyX + getY) {
      return { applied: false, discount: Money.zero(ctx.currency), reason: COUPON_REJECTION.NOT_ELIGIBLE, freeItems: [] };
    }
    const sets = Math.floor(totalQty / (buyX + getY));
    const freeUnits = sets * getY;
    // Discount = freeUnits priced at the cheapest eligible unit price.
    const unit = eligible.reduce((min, i) => (i.unitPrice.amount < min.unitPrice.amount ? i : min)).unitPrice;
    return this.#applied(cap(unit.multiply(freeUnits)), [
      { productId: eligible[0].productId, quantity: freeUnits },
    ]);
  }
}

export const couponEvaluator = new CouponEvaluator();
export default couponEvaluator;
