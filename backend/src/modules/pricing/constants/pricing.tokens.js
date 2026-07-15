/**
 * Module-local DI tokens for the pricing module. Cart, Order, Payment, Refund,
 * Loyalty and Analytics modules resolve the PricingEngine + CouponService
 * through these tokens so they never re-implement money math.
 */
export const PRICING_TOKENS = Object.freeze({
  CouponRepository: Symbol('pricing.CouponRepository'),

  PricingEngine: Symbol('pricing.PricingEngine'),
  CouponService: Symbol('pricing.CouponService'),
  CouponEvaluator: Symbol('pricing.CouponEvaluator'),
  TaxCalculator: Symbol('pricing.TaxCalculator'),
  ServiceChargeCalculator: Symbol('pricing.ServiceChargeCalculator'),
});

export default PRICING_TOKENS;
