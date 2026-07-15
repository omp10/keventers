import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { PRICING_PERMISSIONS } from './constants/pricing.constants.js';
import { PRICING_TOKENS } from './constants/pricing.tokens.js';
import { couponEvaluator } from './engine/coupon.evaluator.js';
import { pricingEngine } from './engine/pricing-engine.js';
import { serviceChargeCalculator } from './engine/service-charge.calculator.js';
import { taxCalculator } from './engine/tax.calculator.js';
import { couponRepository } from './repositories/coupon.repository.js';
import couponRouter from './routes/index.js';
import { couponService } from './services/coupon.service.js';

/**
 * Pricing module composition. The Pricing Engine is the SINGLE SOURCE OF TRUTH
 * for money math — a pure, reusable library that Cart, Orders, Payments,
 * Refunds, Analytics, Invoices and Loyalty compose via DI (`PRICING_TOKENS`).
 * The only HTTP surface is restaurant coupon management. Registered BEFORE the
 * organization module so its specific `/restaurant/coupons` mount wins.
 */
export const pricingModule = {
  name: 'pricing',
  basePath: '/',
  router: couponRouter,

  registerDependencies(container = sharedContainer) {
    container.register(PRICING_TOKENS.CouponRepository, couponRepository);

    container.register(PRICING_TOKENS.PricingEngine, pricingEngine);
    container.register(PRICING_TOKENS.CouponService, couponService);
    container.register(PRICING_TOKENS.CouponEvaluator, couponEvaluator);
    container.register(PRICING_TOKENS.TaxCalculator, taxCalculator);
    container.register(PRICING_TOKENS.ServiceChargeCalculator, serviceChargeCalculator);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(PRICING_PERMISSIONS));
  },

  registerEventHandlers() {
    // No intra-module subscribers this phase (coupon events are for consumers).
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'Pricing module registered');
    return this;
  },
};

export default pricingModule;
