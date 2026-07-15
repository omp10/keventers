/**
 * Analytics & Reporting Engine constants. The engine is PROJECTION-BASED: every
 * dashboard reads from read-optimized projection collections, never from
 * transactional data. Two generic projection shapes cover all domains — a
 * time-bucketed counter (TimeBucketProjection) and a per-entity counter
 * (EntityProjection) — discriminated by `domain` + `metricType`. Adding a metric
 * = incrementing a new key; adding a domain = registering a new updater.
 */

// ==================== DOMAINS ====================

export const DOMAIN = Object.freeze({
  SALES: 'sales',
  ORDERS: 'orders',
  PRODUCTS: 'products',
  KITCHEN: 'kitchen',
  CUSTOMERS: 'customers',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  QR: 'qr',
  TABLES: 'tables',
});

export const ALL_DOMAINS = Object.freeze(Object.values(DOMAIN));

// ==================== TIME PERIODS ====================

export const PERIOD = Object.freeze({
  HOUR: 'hour', // periodKey: YYYY-MM-DDTHH
  DAY: 'day', // periodKey: YYYY-MM-DD
  WEEK: 'week', // periodKey: YYYY-Www (ISO week)
  MONTH: 'month', // periodKey: YYYY-MM
  YEAR: 'year', // periodKey: YYYY
  ALL: 'all', // periodKey: 'all' — lifetime running totals
});

/** Granularities maintained on every time-bucketed event. */
export const MAINTAINED_PERIODS = Object.freeze([PERIOD.HOUR, PERIOD.DAY, PERIOD.WEEK, PERIOD.MONTH, PERIOD.YEAR, PERIOD.ALL]);

// ==================== ENTITY TYPES (EntityProjection) ====================

export const ENTITY_TYPE = Object.freeze({
  PRODUCT: 'product',
  CATEGORY: 'category',
  MODIFIER: 'modifier',
  ADDON: 'addon',
  CHEF: 'chef',
  STATION: 'station',
  TABLE: 'table',
  PROVIDER: 'provider', // payment gateway
  CHANNEL: 'channel', // notification channel
});

// ==================== METRIC KEYS ====================
// Flexible numeric maps ($inc-ed atomically). Averages are derived from a
// sum + count pair at read time (never stored as a mutable average).

export const METRIC = Object.freeze({
  // sales
  GROSS_REVENUE: 'grossRevenue',
  NET_REVENUE: 'netRevenue',
  TAX_TOTAL: 'taxTotal',
  DISCOUNT_TOTAL: 'discountTotal',
  REFUND_TOTAL: 'refundTotal',
  ITEM_COUNT: 'itemCount',
  // orders
  ORDERS_PLACED: 'ordersPlaced',
  ORDERS_COMPLETED: 'ordersCompleted',
  ORDERS_CANCELLED: 'ordersCancelled',
  PREP_TIME_SUM: 'prepTimeMsSum',
  PREP_TIME_COUNT: 'prepTimeCount',
  COMPLETION_TIME_SUM: 'completionMsSum',
  COMPLETION_TIME_COUNT: 'completionCount',
  // products
  UNITS_SOLD: 'unitsSold',
  PRODUCT_REVENUE: 'revenue',
  USAGE_COUNT: 'usageCount',
  // kitchen
  SLA_MET: 'slaMet',
  SLA_BREACHED: 'slaBreached',
  DELAYED_ORDERS: 'delayedOrders',
  READY_COUNT: 'readyCount',
  // customers
  NEW_CUSTOMERS: 'newCustomers',
  RETURNING_CUSTOMERS: 'returningCustomers',
  LOYALTY_EARNED: 'loyaltyEarned',
  LOYALTY_REDEEMED: 'loyaltyRedeemed',
  REFERRALS_COMPLETED: 'referralsCompleted',
  // payments
  PAYMENTS_CAPTURED: 'paymentsCaptured',
  PAYMENTS_FAILED: 'paymentsFailed',
  PAYMENTS_REFUNDED: 'paymentsRefunded',
  CAPTURED_AMOUNT: 'capturedAmount',
  REFUNDED_AMOUNT: 'refundedAmount',
  // notifications
  NTF_QUEUED: 'queued',
  NTF_SENT: 'sent',
  NTF_DELIVERED: 'delivered',
  NTF_READ: 'read',
  NTF_FAILED: 'failed',
  // qr / sessions / tables
  QR_SCANS: 'scans',
  SESSIONS_STARTED: 'sessionsStarted',
  SESSIONS_COMPLETED: 'sessionsCompleted',
  SESSIONS_ABANDONED: 'sessionsAbandoned',
  CONVERSIONS: 'conversions',
  SESSION_DURATION_SUM: 'sessionDurationMsSum',
  SESSION_DURATION_COUNT: 'sessionDurationCount',
  OCCUPANCY_SECONDS: 'occupancySeconds',
});

// ==================== REBUILD / RECONCILIATION ====================

export const REBUILD_STATUS = Object.freeze({
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

export const REBUILD_TYPE = Object.freeze({
  FULL: 'full',
  INCREMENTAL: 'incremental',
  RECONCILE: 'reconcile',
  VALIDATE: 'validate',
});

export const RECON_STATUS = Object.freeze({
  CONSISTENT: 'consistent',
  INCONSISTENT: 'inconsistent',
});

// ==================== EXPORTS ====================

export const EXPORT_FORMAT = Object.freeze({ CSV: 'csv', EXCEL: 'excel', PDF: 'pdf' });

// ==================== QUEUES / REDIS ====================

export const QUEUES = Object.freeze({ REBUILD: 'analytics:rebuild' });
export const JOB_NAMES = Object.freeze({ REBUILD: 'rebuild', RECONCILE: 'reconcile-sweep' });

export const REDIS_KEYS = Object.freeze({
  KPI: 'analytics:kpi', // analytics:kpi:<restaurantId>:<widget>
  TRENDING: 'analytics:trending', // analytics:trending:<restaurantId>
  PREP_CORR: 'analytics:prep', // analytics:prep:<orderId> preparing-timestamp correlation
});

// ==================== RBAC ====================

export const ANALYTICS_NEW_PERMISSIONS = Object.freeze([
  { resource: 'analytics', action: 'read', description: 'View analytics dashboards & reports' },
  { resource: 'analytics', action: 'export', description: 'Export analytics reports' },
  { resource: 'analytics', action: 'rebuild', description: 'Trigger analytics projection rebuilds' },
]);

export const ANALYTICS_PERMISSIONS = Object.freeze({
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  ANALYTICS_REBUILD: 'analytics:rebuild',
});

// ==================== ERRORS ====================

export const ANALYTICS_ERRORS = Object.freeze({
  CROSS_TENANT: 'Resource does not belong to this tenant',
  INVALID_RANGE: 'Invalid date range',
  UNSUPPORTED_FORMAT: 'Unsupported export format',
  REBUILD_NOT_FOUND: 'Rebuild run not found',
  PROJECTION_NOT_FOUND: 'Projection not found',
});
