/**
 * Cart module constants. The cart is the editable representation of an order,
 * owned by a GUEST SESSION (not a customer). It never creates orders — it
 * exposes a checkout-lock boundary the future Order Engine consumes.
 */

/** Cart lifecycle. `ACTIVE` is the persistent live state; `CREATED`/`UPDATED`
 * are lifecycle EVENTS (see cart.events). One ACTIVE cart per guest session. */
export const CART_STATUS = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  UPDATED: 'updated',
  LOCKED: 'locked',
  CHECKOUT_PENDING: 'checkout_pending',
  CONVERTED_TO_ORDER: 'converted_to_order',
  ABANDONED: 'abandoned',
  EXPIRED: 'expired',
});

/** Guarded transitions (enforced by the cart service). */
export const CART_TRANSITIONS = Object.freeze({
  [CART_STATUS.ACTIVE]: [
    CART_STATUS.LOCKED,
    CART_STATUS.ABANDONED,
    CART_STATUS.EXPIRED,
  ],
  [CART_STATUS.LOCKED]: [
    CART_STATUS.CHECKOUT_PENDING,
    CART_STATUS.ACTIVE, // unlock (checkout cancelled)
    CART_STATUS.EXPIRED,
    CART_STATUS.ABANDONED,
  ],
  [CART_STATUS.CHECKOUT_PENDING]: [
    CART_STATUS.CONVERTED_TO_ORDER,
    CART_STATUS.ACTIVE, // checkout abandoned → editable again
    CART_STATUS.EXPIRED,
    CART_STATUS.ABANDONED,
  ],
  [CART_STATUS.CONVERTED_TO_ORDER]: [],
  [CART_STATUS.ABANDONED]: [],
  [CART_STATUS.EXPIRED]: [],
});

/** Statuses in which the cart is still editable / live. */
export const EDITABLE_CART_STATUSES = Object.freeze([CART_STATUS.ACTIVE]);
export const LIVE_CART_STATUSES = Object.freeze([
  CART_STATUS.ACTIVE,
  CART_STATUS.LOCKED,
  CART_STATUS.CHECKOUT_PENDING,
]);

/** Redis key namespaces (all under the platform key prefix). */
export const REDIS_KEYS = Object.freeze({
  CART_CACHE: 'cart:snapshot', // cart:snapshot:<cartId> → serialized cart (TTL = inactivity)
  CART_LOCK: 'cart-mutation', // distributed-lock resource suffix per cart
  IDEMPOTENCY: 'cart:idem', // cart:idem:<cartId>:<key> → stored result
});

/** Storage folder placeholder (cart has no uploads; reserved for parity). */
export const CART_ITEM_LIMITS = Object.freeze({
  MAX_QUANTITY: 99,
  MAX_SPECIAL_INSTRUCTIONS: 500,
  MAX_NOTES: 500,
});

export const CART_ERRORS = Object.freeze({
  CART_NOT_FOUND: 'Cart not found',
  ITEM_NOT_FOUND: 'Cart item not found',
  CART_NOT_EDITABLE: 'This cart can no longer be edited',
  CART_LOCKED: 'Cart is locked for checkout',
  VERSION_CONFLICT: 'The cart was modified by another device — reload and retry',
  MAX_ITEMS: 'Cart item limit reached',
  PRODUCT_UNAVAILABLE: 'This product is not available',
  VARIANT_INVALID: 'Selected variant is invalid or unavailable',
  VARIANT_REQUIRED: 'This product requires a variant selection',
  MODIFIER_INVALID: 'Invalid modifier selection',
  MODIFIER_RULES: 'Modifier selection does not satisfy the group rules',
  ADDON_INVALID: 'Invalid add-on selection',
  RESTAURANT_UNAVAILABLE: 'Restaurant is not currently accepting orders',
  BRANCH_UNAVAILABLE: 'This branch is not currently accepting orders',
  BRANCH_CLOSED: 'This branch is closed right now',
  SESSION_INVALID: 'Your ordering session is no longer active',
  COUPON_INVALID: 'Coupon cannot be applied',
  EMPTY_CART: 'Cannot checkout an empty cart',
  CROSS_TENANT: 'Access to this cart is not allowed',
  ALREADY_CONVERTED: 'This cart has already been converted to an order',
});
