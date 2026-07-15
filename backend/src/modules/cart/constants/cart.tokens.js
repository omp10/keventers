/**
 * Module-local DI tokens for the cart module. The future Order Engine resolves
 * the CartService (via `lockForCheckout` / `convertToOrder`) through these
 * tokens so the cart→order boundary stays clean.
 */
export const CART_TOKENS = Object.freeze({
  CartRepository: Symbol('cart.CartRepository'),

  CartCacheStore: Symbol('cart.CartCacheStore'),
  IdempotencyStore: Symbol('cart.IdempotencyStore'),

  CartService: Symbol('cart.CartService'),
  CartPricingService: Symbol('cart.CartPricingService'),
  CartValidationService: Symbol('cart.CartValidationService'),
});

export default CART_TOKENS;
