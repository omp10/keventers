/**
 * Notification & Communication Engine constants. Enum vocabularies, channel +
 * category taxonomy, template keys, queue names, Redis keys, RBAC + errors.
 * Tunable numbers (retries, rate limits, TTLs) live in `notification.config.js`.
 */

// ==================== CHANNELS ====================

export const CHANNEL = Object.freeze({
  IN_APP: 'inapp',
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
});

export const ALL_CHANNELS = Object.freeze(Object.values(CHANNEL));

/** External channels dispatched through the platform Notification Registry. */
export const EXTERNAL_CHANNELS = Object.freeze([CHANNEL.PUSH, CHANNEL.EMAIL, CHANNEL.SMS, CHANNEL.WHATSAPP]);

// ==================== CATEGORIES (preference groups) ====================

export const CATEGORY = Object.freeze({
  ORDER_UPDATES: 'order_updates',
  PAYMENTS: 'payments',
  LOYALTY: 'loyalty',
  MARKETING: 'marketing',
  SYSTEM: 'system',
  SECURITY: 'security',
});

export const ALL_CATEGORIES = Object.freeze(Object.values(CATEGORY));

/** Categories a user may NOT disable (operational / legal). */
export const MANDATORY_CATEGORIES = Object.freeze([CATEGORY.SECURITY, CATEGORY.SYSTEM]);

// ==================== AUDIENCE ====================

export const AUDIENCE = Object.freeze({
  CUSTOMER: 'customer',
  RESTAURANT: 'restaurant',
  STAFF: 'staff',
  ADMIN: 'admin',
});

// ==================== TEMPLATE KEYS ====================

export const TEMPLATE_KEY = Object.freeze({
  WELCOME: 'welcome',
  CUSTOMER_REGISTERED: 'customer_registered',
  GUEST_LINKED: 'guest_linked',
  ORDER_PLACED: 'order_placed',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_PREPARING: 'order_preparing',
  ORDER_READY: 'order_ready',
  ORDER_COMPLETED: 'order_completed',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_COMPLETED: 'refund_completed',
  LOYALTY_EARNED: 'loyalty_earned',
  TIER_UPGRADED: 'tier_upgraded',
  RESTAURANT_APPROVED: 'restaurant_approved',
});

// ==================== STATUS MACHINES ====================

/** Notification lifecycle. */
export const NOTIFICATION_STATUS = Object.freeze({
  QUEUED: 'queued',
  PROCESSING: 'processing',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

/** Legal forward transitions (guards concurrent/duplicate updates). */
export const NOTIFICATION_TRANSITIONS = Object.freeze({
  queued: ['processing', 'cancelled'],
  processing: ['sent', 'delivered', 'failed', 'cancelled'],
  sent: ['delivered', 'read', 'failed'],
  delivered: ['read'],
  read: [],
  failed: ['queued'], // requeue from dead-letter
  cancelled: [],
});

export const DELIVERY_STATUS = Object.freeze({
  SUCCESS: 'success',
  FAILED: 'failed',
  RETRYING: 'retrying',
});

/** Outbox (transactional-outbox) lifecycle. */
export const OUTBOX_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  DISPATCHED: 'dispatched',
  DEAD: 'dead', // permanently failed → dead-letter, needs investigation
});

export const CAMPAIGN_STATUS = Object.freeze({
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const PRIORITY = Object.freeze({
  CRITICAL: 'critical', // security / payment failure — bypass marketing throttles
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low', // marketing
});

// ==================== PROVIDERS ====================

export const PROVIDER = Object.freeze({
  // email
  SMTP: 'smtp',
  RESEND: 'resend',
  // sms
  TWILIO: 'twilio',
  // whatsapp
  META: 'meta',
  // push
  FCM: 'fcm',
  // in-app
  INAPP: 'inapp',
});

/** Which provider each channel uses is chosen in config (interchangeable). */
export const CHANNEL_PROVIDERS = Object.freeze({
  [CHANNEL.EMAIL]: [PROVIDER.SMTP, PROVIDER.RESEND],
  [CHANNEL.SMS]: [PROVIDER.TWILIO],
  [CHANNEL.WHATSAPP]: [PROVIDER.META],
  [CHANNEL.PUSH]: [PROVIDER.FCM],
  [CHANNEL.IN_APP]: [PROVIDER.INAPP],
});

// ==================== QUEUES ====================

export const QUEUES = Object.freeze({
  OUTBOX: 'notifications:outbox',
  DELIVERY: 'notifications:delivery',
  DEAD_LETTER: 'notifications:dead-letter',
});

export const JOB_NAMES = Object.freeze({
  DISPATCH_OUTBOX: 'dispatch-outbox',
  RELAY_SWEEP: 'relay-sweep',
  DELIVER: 'deliver',
});

// ==================== REDIS KEYS ====================

export const REDIS_KEYS = Object.freeze({
  DEDUPE: 'ntf:dedupe', // ntf:dedupe:<dedupeKey>
  RATE: 'ntf:rate', // ntf:rate:<recipient>:<category>
  DELIVERY_LOCK: 'ntf:lock', // ntf:lock:<notificationId>
  OUTBOX_LOCK: 'ntf:outbox:lock',
});

// ==================== RBAC ====================

export const NOTIFICATION_NEW_PERMISSIONS = Object.freeze([
  { resource: 'notification', action: 'read', description: 'View notifications' },
  { resource: 'notification', action: 'send', description: 'Send / test notifications' },
  { resource: 'notification', action: 'manage', description: 'Manage notifications & delivery' },
  { resource: 'notification_template', action: 'read', description: 'View notification templates' },
  { resource: 'notification_template', action: 'manage', description: 'Manage notification templates' },
  { resource: 'notification_campaign', action: 'read', description: 'View notification campaigns' },
  { resource: 'notification_campaign', action: 'manage', description: 'Manage notification campaigns' },
]);

export const NOTIFICATION_PERMISSIONS = Object.freeze({
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_MANAGE: 'notification:manage',
  TEMPLATE_READ: 'notification_template:read',
  TEMPLATE_MANAGE: 'notification_template:manage',
  CAMPAIGN_READ: 'notification_campaign:read',
  CAMPAIGN_MANAGE: 'notification_campaign:manage',
});

// ==================== ERRORS ====================

export const NOTIFICATION_ERRORS = Object.freeze({
  NOTIFICATION_NOT_FOUND: 'Notification not found',
  TEMPLATE_NOT_FOUND: 'Notification template not found',
  PREFERENCE_NOT_FOUND: 'Notification preference not found',
  CAMPAIGN_NOT_FOUND: 'Campaign not found',
  CROSS_TENANT: 'Resource does not belong to this tenant',
  CHANNEL_NOT_SUPPORTED: 'Notification channel not supported',
  PROVIDER_NOT_CONFIGURED: 'No provider is configured for this channel',
  INVALID_TEMPLATE: 'Template is invalid or missing required variables',
  NOT_LINKED: 'This action requires a registered account',
});

export const DEFAULT_LOCALE = 'en';
