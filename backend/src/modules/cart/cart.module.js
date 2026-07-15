import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';

import { CART_TOKENS } from './constants/cart.tokens.js';
import { registerCartEventHandlers } from './events/handlers.js';
import { cartRepository } from './repositories/cart.repository.js';
import cartRouter from './routes/index.js';
import { cartPricingService } from './services/cart-pricing.service.js';
import { cartValidationService } from './services/cart-validation.service.js';
import { cartService } from './services/cart.service.js';
import { cartCacheStore } from './stores/cart-cache.store.js';
import { idempotencyStore } from './stores/idempotency.store.js';

/**
 * Cart module composition. Mounted at the API v1 root (basePath '/') at the
 * specific `/cart` path. Composes the reusable Pricing Engine (#modules/pricing)
 * for ALL money math, the Catalog module for product validation, and the QR
 * guest session as the cart's owner. Registered BEFORE the organization module
 * (consistent with the other business modules). No new RBAC permissions — the
 * cart is guest-session authenticated, not staff-authorized.
 */
export const cartModule = {
  name: 'cart',
  basePath: '/',
  router: cartRouter,

  registerDependencies(container = sharedContainer) {
    container.register(CART_TOKENS.CartRepository, cartRepository);
    container.register(CART_TOKENS.CartCacheStore, cartCacheStore);
    container.register(CART_TOKENS.IdempotencyStore, idempotencyStore);
    container.register(CART_TOKENS.CartService, cartService);
    container.register(CART_TOKENS.CartPricingService, cartPricingService);
    container.register(CART_TOKENS.CartValidationService, cartValidationService);
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerCartEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'Cart module registered');
    return this;
  },
};

export default cartModule;
