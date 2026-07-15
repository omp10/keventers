/**
 * Pricing module — PUBLIC BARREL. The reusable Pricing Engine is the SINGLE
 * SOURCE OF TRUTH for money math: Cart, Orders, Payments, Refunds, Analytics,
 * Invoices and Loyalty import from here and NEVER calculate prices themselves.
 */
export { pricingModule } from './pricing.module.js';

// The Money value object (integer minor units — the only correct money type).
export { Money } from './money/money.js';
export {
  roundHalfUp,
  roundToNearest,
  roundUpToNearest,
  RoundingMode,
} from './money/rounding.js';

// The engine + calculators (pure, reusable).
export { pricingEngine, PricingEngine } from './engine/pricing-engine.js';
export { couponEvaluator, CouponEvaluator } from './engine/coupon.evaluator.js';
export { taxCalculator, TaxCalculator } from './engine/tax.calculator.js';
export { serviceChargeCalculator, ServiceChargeCalculator } from './engine/service-charge.calculator.js';
export { discountCalculator, DiscountCalculator } from './engine/discount.calculator.js';

// Serialization.
export { toPricingBreakdownDTO, toCouponDTO } from './dto/pricing.dto.js';

// Coupon service (resolution + management).
export { couponService } from './services/coupon.service.js';

// DI tokens + events + constants.
export { PRICING_TOKENS } from './constants/pricing.tokens.js';
export * from './events/pricing.events.js';
export {
  TAX_MODE,
  SERVICE_CHARGE_TYPE,
  DISCOUNT_SCOPE,
  DISCOUNT_TYPE,
  COUPON_TYPE,
  COUPON_STATUS,
  COUPON_REJECTION,
  EXTRA_CHARGE,
  PRICING_EXTENSIONS,
  PRICING_PERMISSIONS,
} from './constants/pricing.constants.js';

// Seeder.
export { pricingSeeder, PricingSeeder } from './seeds/pricing.seeder.js';
