import {
  DISCOUNT_SCOPE,
  EXTRA_CHARGE,
  TAX_MODE,
} from '../constants/pricing.constants.js';
import { Money } from '../money/money.js';
import { roundToNearest } from '../money/rounding.js';

import { couponEvaluator } from './coupon.evaluator.js';
import { discountCalculator } from './discount.calculator.js';
import { serviceChargeCalculator } from './service-charge.calculator.js';
import { taxCalculator } from './tax.calculator.js';

/**
 * The Pricing Engine — the SINGLE SOURCE OF TRUTH for every monetary
 * calculation. Pure and deterministic: given a normalized PricingRequest it
 * returns a complete, auditable breakdown built entirely from integer
 * minor-unit Money. No DB, no clock (accepts `now`), no floats. Cart, Orders,
 * Payments, Refunds, Invoices, Analytics and Loyalty all call THIS — nothing
 * else computes prices.
 *
 * Composition:
 *   Σ line(base + variant + modifiers + addons) × qty         → subtotal
 *   − product − menu − restaurant − coupon discounts          → discountedSubtotal
 *   + service charge
 *   + taxes (exclusive) | embedded (inclusive)
 *   + delivery/packaging/platform fees (future; pass-through 0)
 *   ± rounding
 *   = total
 *
 * @typedef {object} PricingRequestItem
 * @property {string} reference   Opaque id echoed back (e.g. cart item id).
 * @property {string} productId
 * @property {number} quantity
 * @property {{ base:number, variant?:number, modifiers?:number[], addons?:number[] }} components  minor units
 *
 * @typedef {object} PricingRequest
 * @property {string} currency
 * @property {PricingRequestItem[]} items
 * @property {Array<{scope:string,type:string,value:number,maxDiscount?:number}>} [discounts]
 * @property {object|null} [coupon]
 * @property {{ mode:string, rates:Array<{name:string,bps:number}>, taxServiceCharge?:boolean }} [tax]
 * @property {{ type:string, value:number, taxable?:boolean }|null} [serviceCharge]
 * @property {{ deliveryFee?:number, packagingFee?:number, platformFee?:number }} [charges]
 * @property {{ step?:number }} [rounding]
 * @property {Date} [now]
 */
export class PricingEngine {
  constructor({
    coupons = couponEvaluator,
    discounts = discountCalculator,
    tax = taxCalculator,
    serviceCharge = serviceChargeCalculator,
  } = {}) {
    this.coupons = coupons;
    this.discounts = discounts;
    this.tax = tax;
    this.serviceCharge = serviceCharge;
  }

  /**
   * @param {PricingRequest} request
   * @returns {object} A breakdown of Money objects (serialize via toPricingDTO).
   */
  calculate(request) {
    const currency = request.currency ?? 'INR';
    const zero = Money.zero(currency);

    // 1) Line subtotals from component snapshots.
    const items = (request.items ?? []).map((it) => {
      const c = it.components ?? {};
      const unit = Money.of(
        (c.base ?? 0) +
          (c.variant ?? 0) +
          (c.modifiers ?? []).reduce((s, m) => s + (m ?? 0), 0) +
          (c.addons ?? []).reduce((s, a) => s + (a ?? 0), 0),
        currency,
      );
      const quantity = Math.max(0, Math.trunc(it.quantity ?? 0));
      return {
        reference: it.reference ?? null,
        productId: it.productId ?? null,
        quantity,
        unitPrice: unit,
        lineSubtotal: unit.multiply(quantity),
      };
    });

    const subtotal = Money.sum(items.map((i) => i.lineSubtotal), currency);

    // 2) Non-coupon discounts (product → menu → restaurant, cascading).
    const scoped = this.discounts.compute(subtotal, request.discounts ?? []);

    // 3) Coupon (evaluated inside the engine).
    let couponDiscount = zero;
    let couponReason = null;
    let couponApplied = false;
    let freeItems = [];
    if (request.coupon) {
      const afterScoped = subtotal.subtract(scoped.total);
      const verdict = this.coupons.evaluate(request.coupon, {
        currency,
        subtotal: afterScoped.max(zero),
        items: items.map((i) => ({ productId: i.productId, unitPrice: i.unitPrice, quantity: i.quantity })),
        now: request.now ?? new Date(),
      });
      couponApplied = verdict.applied;
      couponReason = verdict.reason;
      freeItems = verdict.freeItems ?? [];
      couponDiscount = verdict.discount.clampMax(afterScoped.max(zero));
    }

    const totalDiscount = scoped.total.add(couponDiscount);
    const discountedSubtotal = subtotal.subtract(totalDiscount).max(zero);

    // 4) Service charge (on the discounted subtotal).
    const serviceCharge = this.serviceCharge.compute(discountedSubtotal, request.serviceCharge);

    // 5) Taxes.
    const mode = request.tax?.mode ?? TAX_MODE.EXCLUSIVE;
    const taxServiceCharge = request.tax?.taxServiceCharge ?? true;
    const taxableBase =
      mode === TAX_MODE.EXCLUSIVE && taxServiceCharge
        ? discountedSubtotal.add(serviceCharge)
        : discountedSubtotal;
    const tax = this.tax.compute(taxableBase, request.tax ?? {});

    // 6) Future-ready extra charges (pass-through; default 0).
    const charges = this.#charges(request.charges, currency);

    // 7) Assemble pre-rounding total.
    const preRounding =
      mode === TAX_MODE.INCLUSIVE
        ? discountedSubtotal.add(serviceCharge).add(charges.total) // tax already embedded
        : discountedSubtotal.add(serviceCharge).add(tax.total).add(charges.total);

    // 8) Rounding to nearest step (e.g. nearest rupee = 100 paise).
    const step = request.rounding?.step ?? 1;
    const roundedAmount = roundToNearest(preRounding.amount, step);
    const roundingAdjustment = Money.of(roundedAmount - preRounding.amount, currency);
    const total = Money.of(roundedAmount, currency);

    return {
      currency,
      items,
      subtotal,
      discounts: {
        [DISCOUNT_SCOPE.PRODUCT]: scoped.byScope[DISCOUNT_SCOPE.PRODUCT],
        [DISCOUNT_SCOPE.MENU]: scoped.byScope[DISCOUNT_SCOPE.MENU],
        [DISCOUNT_SCOPE.RESTAURANT]: scoped.byScope[DISCOUNT_SCOPE.RESTAURANT],
        [DISCOUNT_SCOPE.COUPON]: couponDiscount,
        total: totalDiscount,
        couponApplied,
        couponReason,
      },
      discountedSubtotal,
      serviceCharge,
      tax,
      charges,
      freeItems,
      roundingAdjustment,
      total,
    };
  }

  #charges(input = {}, currency) {
    const delivery = Money.of(Math.trunc(input[EXTRA_CHARGE.DELIVERY_FEE] ?? 0), currency);
    const packaging = Money.of(Math.trunc(input[EXTRA_CHARGE.PACKAGING_FEE] ?? 0), currency);
    const platform = Money.of(Math.trunc(input[EXTRA_CHARGE.PLATFORM_FEE] ?? 0), currency);
    return { delivery, packaging, platform, total: Money.sum([delivery, packaging, platform], currency) };
  }
}

export const pricingEngine = new PricingEngine();
export default pricingEngine;
