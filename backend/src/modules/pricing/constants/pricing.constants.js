/**
 * Pricing Engine + Coupon constants. This module is the SINGLE SOURCE OF TRUTH
 * for every monetary calculation used by Cart, Orders, Payments, Refunds,
 * Analytics, Invoices and Loyalty. No other module calculates prices.
 */

/** Tax application mode (restaurant-configured). */
export const TAX_MODE = Object.freeze({
  EXCLUSIVE: 'exclusive', // tax added on top of the price
  INCLUSIVE: 'inclusive', // tax already embedded in the price
});

/** Service charge kind. */
export const SERVICE_CHARGE_TYPE = Object.freeze({
  PERCENTAGE: 'percentage', // value is basis points
  FIXED: 'fixed', // value is minor units
});

/** Discount scopes composed by the engine (in application order). */
export const DISCOUNT_SCOPE = Object.freeze({
  PRODUCT: 'product',
  MENU: 'menu',
  RESTAURANT: 'restaurant',
  COUPON: 'coupon',
});

/** Discount kinds. */
export const DISCOUNT_TYPE = Object.freeze({
  PERCENTAGE: 'percentage', // basis points
  FIXED: 'fixed', // minor units
});

/** Coupon kinds (validated inside the Pricing Engine). */
export const COUPON_TYPE = Object.freeze({
  PERCENTAGE: 'percentage', // value = bps, optional maxDiscount
  FIXED: 'fixed', // value = minor units
  FREE_ITEM: 'free_item', // free targeted product (cheapest eligible)
  BUY_X_GET_Y: 'buy_x_get_y', // buyQuantity / getQuantity on a product
});

export const COUPON_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
});

/** Who a coupon is offered to. Restaurant scoping is orthogonal (every coupon
 *  already belongs to one restaurant); this narrows WITHIN that by customer. */
export const COUPON_AUDIENCE = Object.freeze({
  ALL: 'all', // any customer of the restaurant
  NEW_CUSTOMERS: 'new_customers', // customers with no prior order
});

/** Reasons a coupon can be rejected (returned by the evaluator). */
export const COUPON_REJECTION = Object.freeze({
  NOT_FOUND: 'not_found',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  NOT_STARTED: 'not_started',
  MIN_SUBTOTAL: 'min_subtotal_not_met',
  USAGE_LIMIT: 'usage_limit_reached',
  NOT_ELIGIBLE: 'no_eligible_items',
  CURRENCY_MISMATCH: 'currency_mismatch',
  NOT_NEW_CUSTOMER: 'not_a_new_customer',
  PER_CUSTOMER_LIMIT: 'per_customer_limit_reached',
});

/** Charge kinds reserved as future-ready EXTENSION POINTS (all default to 0 —
 * NOT implemented this phase; the engine accepts and passes them through). */
export const EXTRA_CHARGE = Object.freeze({
  DELIVERY_FEE: 'deliveryFee',
  PACKAGING_FEE: 'packagingFee',
  PLATFORM_FEE: 'platformFee',
});

/** Named pricing-engine extension hooks (documented seams; not implemented). */
export const PRICING_EXTENSIONS = Object.freeze({
  SURGE_PRICING: 'surge_pricing',
  DYNAMIC_PRICING: 'dynamic_pricing',
  LOYALTY_REDEMPTION: 'loyalty_redemption',
});

/** Permissions specific to coupon management (net-new; seeded here). */
export const PRICING_PERMISSIONS = Object.freeze({
  COUPON_READ: 'coupon:read',
  COUPON_CREATE: 'coupon:create',
  COUPON_UPDATE: 'coupon:update',
  COUPON_DELETE: 'coupon:delete',
});

export const PRICING_NEW_PERMISSIONS = Object.freeze([
  { resource: 'coupon', action: 'create', description: 'Create coupons' },
  { resource: 'coupon', action: 'read', description: 'View coupons' },
  { resource: 'coupon', action: 'update', description: 'Update coupons' },
  { resource: 'coupon', action: 'delete', description: 'Delete coupons' },
]);

export const PRICING_ERRORS = Object.freeze({
  COUPON_NOT_FOUND: 'Coupon not found',
  DUPLICATE_COUPON: 'A coupon with this code already exists in this restaurant',
  INVALID_COUPON: 'Coupon cannot be applied',
  NOT_NEW_CUSTOMER: 'This coupon is only for first-time customers',
  PER_CUSTOMER_LIMIT: "You've already used this coupon the maximum number of times",
  CURRENCY_MISMATCH: 'Currency mismatch in pricing request',
  CROSS_TENANT: 'Access to this coupon is not allowed',
});
