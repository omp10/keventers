/**
 * Payment Engine constants. This module is the SINGLE FINANCIAL SOURCE OF TRUTH.
 * It NEVER calculates prices — it consumes the immutable Pricing-Engine snapshot
 * on the Order (integer minor units, via the Money value object). It is
 * provider-agnostic: no gateway logic lives outside the provider adapters.
 */

/** Supported gateways (provider-agnostic core; adapters implement each). */
export const PROVIDER = Object.freeze({
  RAZORPAY: 'razorpay',
  PHONEPE: 'phonepe',
  // Future (no service change needed): CASHFREE, STRIPE, PAYU, JUSPAY, PAYTM.
});

export const ENVIRONMENT = Object.freeze({
  TEST: 'test',
  LIVE: 'live',
});

/** Payment methods (exposed only if the selected provider supports them). */
export const PAYMENT_METHOD = Object.freeze({
  UPI: 'upi',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  NET_BANKING: 'net_banking',
  WALLET: 'wallet',
  CASH: 'cash', // pay-at-counter (no provider)
});

/** Payment Intent lifecycle (the entry point of every payment). */
/**
 * What a payment is FOR. Everything predating this is an order payment, so
 * ORDER is the default and existing rows/flows are unaffected; SUBSCRIPTION
 * settles by activating a customer's plan instead of syncing an order.
 */
export const PAYMENT_PURPOSE = Object.freeze({
  ORDER: 'order',
  SUBSCRIPTION: 'subscription',
});

export const INTENT_STATUS = Object.freeze({
  CREATED: 'created',
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

/** Payment lifecycle. A payment is one tender against an order (multi-payment). */
export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
});

/** Legal payment transitions (guarded by the aggregate). */
export const PAYMENT_TRANSITIONS = Object.freeze({
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED],
  [PAYMENT_STATUS.AUTHORIZED]: [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED],
  [PAYMENT_STATUS.CAPTURED]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED],
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED],
  [PAYMENT_STATUS.FAILED]: [],
  [PAYMENT_STATUS.CANCELLED]: [],
  [PAYMENT_STATUS.REFUNDED]: [],
});

/** Immutable transaction (ledger) kinds. */
export const TRANSACTION_TYPE = Object.freeze({
  AUTHORIZATION: 'authorization',
  CAPTURE: 'capture',
  REFUND: 'refund',
  VOID: 'void',
  FAILURE: 'failure',
});

export const TRANSACTION_STATUS = Object.freeze({
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
});

/** Refund lifecycle. Execution belongs to the provider. */
export const REFUND_STATUS = Object.freeze({
  REQUESTED: 'requested',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

export const REFUND_TRANSITIONS = Object.freeze({
  [REFUND_STATUS.REQUESTED]: [REFUND_STATUS.APPROVED, REFUND_STATUS.FAILED],
  [REFUND_STATUS.APPROVED]: [REFUND_STATUS.PROCESSING, REFUND_STATUS.FAILED],
  [REFUND_STATUS.PROCESSING]: [REFUND_STATUS.COMPLETED, REFUND_STATUS.FAILED],
  [REFUND_STATUS.COMPLETED]: [],
  [REFUND_STATUS.FAILED]: [],
});

export const INVOICE_STATUS = Object.freeze({
  ISSUED: 'issued',
  CANCELLED: 'cancelled',
});

export const SETTLEMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

/** Webhook processing status (dedup + idempotency). */
export const WEBHOOK_STATUS = Object.freeze({
  RECEIVED: 'received',
  PROCESSED: 'processed',
  IGNORED: 'ignored',
  FAILED: 'failed',
});

/** Redis key namespaces. */
export const REDIS_KEYS = Object.freeze({
  PAYMENT_LOCK: 'pay:lock', // per order/payment mutation lock
  IDEMPOTENCY: 'pay:idem', // create-intent / confirm idempotency
  WEBHOOK_DEDUP: 'pay:webhook', // provider event id dedup
  PAYMENT_SESSION: 'pay:session', // temporary payment session (intent → checkout)
});

/** Socket.IO realtime events (restaurant dashboards). */
export const SOCKET_EVENTS = Object.freeze({
  PAYMENT_PENDING: 'payment:pending',
  PAYMENT_AUTHORIZED: 'payment:authorized',
  PAYMENT_CAPTURED: 'payment:captured',
  PAYMENT_FAILED: 'payment:failed',
  REFUND_COMPLETED: 'payment:refund_completed',
});

/** Permissions (net-new granular ones; `payment` CRUD already in identity catalog). */
export const PAYMENT_PERMISSIONS = Object.freeze({
  PAYMENT_READ: 'payment:read',
  PAYMENT_REFUND: 'payment:refund',
  PAYMENT_CONFIG: 'payment:config',
  SETTLEMENT_READ: 'settlement:read',
  SETTLEMENT_MANAGE: 'settlement:manage',
});

export const PAYMENT_NEW_PERMISSIONS = Object.freeze([
  { resource: 'payment', action: 'refund', description: 'Initiate / approve payment refunds' },
  { resource: 'payment', action: 'config', description: 'Manage restaurant payment provider config' },
  { resource: 'settlement', action: 'read', description: 'View settlements' },
  { resource: 'settlement', action: 'manage', description: 'Manage settlements' },
]);

export const PAYMENT_ERRORS = Object.freeze({
  ORDER_NOT_FOUND: 'Order not found',
  ORDER_NOT_PAYABLE: 'This order cannot be paid',
  INTENT_NOT_FOUND: 'Payment intent not found',
  PAYMENT_NOT_FOUND: 'Payment not found',
  REFUND_NOT_FOUND: 'Refund not found',
  CONFIG_NOT_FOUND: 'No payment provider is configured for this restaurant',
  PROVIDER_NOT_SUPPORTED: 'Payment provider is not supported',
  METHOD_NOT_SUPPORTED: 'This payment method is not supported by the provider',
  AMOUNT_EXCEEDS_BALANCE: 'Amount exceeds the remaining order balance',
  INVALID_AMOUNT: 'Invalid payment amount',
  CURRENCY_MISMATCH: 'Currency mismatch',
  SIGNATURE_INVALID: 'Payment signature verification failed',
  WEBHOOK_SIGNATURE_INVALID: 'Webhook signature verification failed',
  WEBHOOK_REPLAY: 'Webhook rejected (replay / stale timestamp)',
  DUPLICATE_PAYMENT: 'A payment is already in progress for this intent',
  DUPLICATE_REFUND: 'Refund amount exceeds the refundable balance',
  NOT_REFUNDABLE: 'This payment cannot be refunded',
  INVALID_TRANSITION: 'Illegal payment status transition',
  VERSION_CONFLICT: 'The payment was modified concurrently — reload and retry',
  CROSS_TENANT: 'Access to this payment resource is not allowed',
});
