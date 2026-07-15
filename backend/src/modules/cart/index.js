/**
 * Cart module — PUBLIC BARREL. The future Order Engine imports the CartService
 * from here and consumes the checkout boundary (`lockForCheckout` /
 * `convertToOrder`) — the cart never creates orders itself.
 */
export { cartModule } from './cart.module.js';

// Service singletons (the Order Engine composes these via DI tokens).
export { cartService } from './services/cart.service.js';
export { cartPricingService } from './services/cart-pricing.service.js';
export { cartValidationService } from './services/cart-validation.service.js';

// DI tokens.
export { CART_TOKENS } from './constants/cart.tokens.js';

// Domain events + names other modules can subscribe to.
export * from './events/cart.events.js';

// Public constants (Order Engine keys off the cart lifecycle).
export {
  CART_STATUS,
  CART_TRANSITIONS,
  LIVE_CART_STATUSES,
  EDITABLE_CART_STATUSES,
} from './constants/cart.constants.js';
