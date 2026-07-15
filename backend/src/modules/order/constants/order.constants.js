/**
 * Order Management Engine constants. The order transforms a validated cart into
 * a permanent, immutable record. It NEVER calculates prices (consumes the
 * Pricing Engine via the cart lock) and NEVER creates orders directly (goes
 * through CartService.lockForCheckout → OrderService.create → convertToOrder).
 */

/** Order lifecycle status. */
export const ORDER_STATUS = Object.freeze({
  CREATED: 'created',
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
});

/**
 * Legal state transitions. The Order Aggregate rejects anything not listed here
 * with a domain error — controllers can never move status arbitrarily.
 *
 *   CREATED → PLACED → CONFIRMED → PREPARING → READY → SERVED → COMPLETED
 *   (…CREATED/PLACED/CONFIRMED/PREPARING) → CANCELLED
 *   COMPLETED → REFUND_PENDING → REFUNDED (or back to COMPLETED on rejection)
 */
export const ORDER_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.CREATED]: [ORDER_STATUS.PLACED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.SERVED],
  [ORDER_STATUS.SERVED]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [ORDER_STATUS.REFUND_PENDING],
  [ORDER_STATUS.REFUND_PENDING]: [ORDER_STATUS.REFUNDED, ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REFUNDED]: [],
});

/** Statuses beyond which a customer may no longer cancel (kitchen has started). */
export const CUSTOMER_CANCELLABLE = Object.freeze([ORDER_STATUS.PLACED, ORDER_STATUS.CONFIRMED]);
/** Statuses a restaurant/platform may still cancel from. */
export const STAFF_CANCELLABLE = Object.freeze([
  ORDER_STATUS.PLACED,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
]);

/** Terminal statuses (no further transitions). */
export const TERMINAL_STATUSES = Object.freeze([
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REFUNDED,
]);

/** Who performed a transition (timeline + audit). */
export const ACTOR_TYPE = Object.freeze({
  CUSTOMER: 'customer',
  GUEST: 'guest',
  RESTAURANT: 'restaurant',
  PLATFORM: 'platform',
  SYSTEM: 'system',
});

/** Fulfilment channel (drives order-number channel segment). */
export const ORDER_TYPE = Object.freeze({
  DINE_IN: 'dine_in',
  TAKEAWAY: 'takeaway',
  DELIVERY: 'delivery',
});

export const ORDER_TYPE_CODE = Object.freeze({
  [ORDER_TYPE.DINE_IN]: 'DIN',
  [ORDER_TYPE.TAKEAWAY]: 'TKA',
  [ORDER_TYPE.DELIVERY]: 'DEL',
});

/** Who initiated a cancellation. */
export const CANCELLATION_SOURCE = Object.freeze({
  CUSTOMER: 'customer',
  RESTAURANT: 'restaurant',
  PLATFORM: 'platform',
});

/** Payment status — EXTENSION POINT ONLY (no processing this phase). */
export const PAYMENT_STATUS = Object.freeze({
  NOT_REQUIRED: 'not_required',
  AWAITING_PAYMENT: 'awaiting_payment',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
});

/** Refund status — EXTENSION POINT ONLY (no money movement this phase). */
export const REFUND_STATUS = Object.freeze({
  NONE: 'none',
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
});

/** Order note kinds + visibility. */
export const NOTE_TYPE = Object.freeze({
  CUSTOMER: 'customer',
  RESTAURANT: 'restaurant',
  KITCHEN: 'kitchen',
});
export const NOTE_VISIBILITY = Object.freeze({
  PUBLIC: 'public', // customer + staff
  INTERNAL: 'internal', // staff only
});

/** Redis key namespaces. */
export const REDIS_KEYS = Object.freeze({
  CHECKOUT_LOCK: 'order:checkout', // per session, duplicate-submission guard
  ORDER_LOCK: 'order:mutation', // per order, transition serialization
  IDEMPOTENCY: 'order:idem', // per session checkout idempotency
  ORDER_CACHE: 'order:snapshot', // realtime order cache
});

export const CACHE_TTL = Object.freeze({
  ORDER_SECONDS: 900,
  IDEMPOTENCY_SECONDS: 86400,
});

/** Socket.IO event names (realtime status propagation). */
export const SOCKET_EVENTS = Object.freeze({
  ORDER_PLACED: 'order:placed',
  ORDER_CONFIRMED: 'order:confirmed',
  ORDER_PREPARING: 'order:preparing',
  ORDER_READY: 'order:ready',
  ORDER_SERVED: 'order:served',
  ORDER_COMPLETED: 'order:completed',
  ORDER_CANCELLED: 'order:cancelled',
});

/** Map a status to its realtime socket event (when one exists). */
export const STATUS_SOCKET_EVENT = Object.freeze({
  [ORDER_STATUS.PLACED]: SOCKET_EVENTS.ORDER_PLACED,
  [ORDER_STATUS.CONFIRMED]: SOCKET_EVENTS.ORDER_CONFIRMED,
  [ORDER_STATUS.PREPARING]: SOCKET_EVENTS.ORDER_PREPARING,
  [ORDER_STATUS.READY]: SOCKET_EVENTS.ORDER_READY,
  [ORDER_STATUS.SERVED]: SOCKET_EVENTS.ORDER_SERVED,
  [ORDER_STATUS.COMPLETED]: SOCKET_EVENTS.ORDER_COMPLETED,
  [ORDER_STATUS.CANCELLED]: SOCKET_EVENTS.ORDER_CANCELLED,
});

/** Default order-number prefix when a restaurant has none configured. */
export const DEFAULT_ORDER_PREFIX = 'ORD';

/** Permissions specific to this module (net-new; seeded here). `order:*` CRUD
 * already exists in the identity core catalog. */
export const ORDER_PERMISSIONS = Object.freeze({
  ORDER_READ: 'order:read',
  ORDER_MANAGE: 'order:manage',
  ORDER_CANCEL: 'order:cancel',
  REFUND_REQUEST: 'refund:request',
  REFUND_APPROVE: 'refund:approve',
});

export const ORDER_NEW_PERMISSIONS = Object.freeze([
  { resource: 'order', action: 'manage', description: 'Manage order status transitions' },
  { resource: 'order', action: 'cancel', description: 'Cancel orders' },
  { resource: 'refund', action: 'request', description: 'Request an order refund' },
  { resource: 'refund', action: 'approve', description: 'Approve/reject/complete refunds' },
]);

export const ORDER_ERRORS = Object.freeze({
  ORDER_NOT_FOUND: 'Order not found',
  NO_CART: 'No cart is ready for checkout',
  EMPTY_CART: 'Cannot place an order from an empty cart',
  CART_NOT_LOCKABLE: 'The cart could not be locked for checkout',
  INVALID_TRANSITION: 'Illegal order status transition',
  NOT_CANCELLABLE: 'This order can no longer be cancelled',
  ALREADY_EXISTS: 'An order already exists for this cart',
  CROSS_TENANT: 'Access to this order is not allowed',
  VERSION_CONFLICT: 'The order was modified concurrently — reload and retry',
  DUPLICATE_CHECKOUT: 'A checkout is already in progress for this session',
  REFUND_NOT_ALLOWED: 'A refund cannot be requested for this order',
});
