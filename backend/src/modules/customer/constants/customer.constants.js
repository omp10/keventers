/**
 * Customer Platform & Loyalty constants. Enum vocabularies + Redis key builders +
 * RBAC permissions + error messages. Tunable numbers (earn rate, tier thresholds,
 * TTLs) live in `customer.config.js` (env-driven) — never hardcoded in services.
 */

/** How a Customer record came to exist. */
export const CUSTOMER_ORIGIN = Object.freeze({
  GUEST_SESSION: 'guest_session',
  REGISTERED: 'registered',
  STAFF_CREATED: 'staff_created',
  IMPORT: 'import',
});

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated',
  DELETED: 'deleted', // GDPR erasure — PII scrubbed, record retained for ledger integrity
});

export const ADDRESS_TYPE = Object.freeze({
  HOME: 'home',
  WORK: 'work',
  OTHER: 'other',
});

export const DIETARY_PREFERENCE = Object.freeze({
  VEG: 'veg',
  NON_VEG: 'non_veg',
  VEGAN: 'vegan',
  EGGETARIAN: 'eggetarian',
  JAIN: 'jain',
});

// ==================== LOYALTY ====================

/** Immutable ledger entry types. The balance is the signed sum of these. */
export const LOYALTY_TXN_TYPE = Object.freeze({
  EARN: 'earn', // + from spend
  REDEEM: 'redeem', // − to claim a reward
  ADJUST: 'adjust', // ± manual staff/admin correction
  EXPIRE: 'expire', // − points aged out
  BONUS: 'bonus', // + campaign / referral / signup
  REVERSAL: 'reversal', // ± clawback (e.g. refund of an earning order)
});

/** Signed direction each ledger type contributes to the balance. */
export const LOYALTY_SIGN = Object.freeze({
  earn: 1,
  redeem: -1,
  adjust: 0, // sign carried by the amount itself
  expire: -1,
  bonus: 1,
  reversal: 0, // sign carried by the amount itself
});

/** Natural source of a ledger entry — the (type,id) pair is the idempotency key. */
export const LOYALTY_SOURCE = Object.freeze({
  PAYMENT: 'payment',
  REFUND: 'refund',
  ORDER: 'order',
  REWARD: 'reward',
  REFERRAL: 'referral',
  MANUAL: 'manual',
  SIGNUP: 'signup',
  CAMPAIGN: 'campaign',
  EXPIRATION: 'expiration',
});

export const LOYALTY_TIER = Object.freeze({
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
});

/** Tier order (index = rank) for upgrade/downgrade comparisons. */
export const TIER_ORDER = Object.freeze([
  LOYALTY_TIER.BRONZE,
  LOYALTY_TIER.SILVER,
  LOYALTY_TIER.GOLD,
  LOYALTY_TIER.PLATINUM,
]);

// ==================== REWARDS ====================

export const REWARD_TYPE = Object.freeze({
  DISCOUNT: 'discount', // % (basis points) or fixed (minor units) off an order
  FREE_PRODUCT: 'free_product', // a specific product on the house
  CASHBACK: 'cashback', // credited to wallet (future) / loyalty
  COUPON: 'coupon', // issues a Pricing-Engine coupon code
});

export const REWARD_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
});

export const REDEMPTION_STATUS = Object.freeze({
  ISSUED: 'issued', // points debited, artifact issued, not yet consumed
  APPLIED: 'applied', // consumed against an order
  EXPIRED: 'expired',
  CANCELLED: 'cancelled', // rolled back (points re-credited)
});

// ==================== REFERRAL (design-only) ====================

export const REFERRAL_STATUS = Object.freeze({
  PENDING: 'pending', // code shared, referee not yet qualified
  COMPLETED: 'completed', // referee qualified → rewards granted
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

// ==================== TIMELINE ====================

export const TIMELINE_EVENT = Object.freeze({
  REGISTERED: 'registered',
  MERGED: 'merged',
  LOYALTY_EARNED: 'loyalty_earned',
  LOYALTY_REDEEMED: 'loyalty_redeemed',
  LOYALTY_EXPIRED: 'loyalty_expired',
  LOYALTY_ADJUSTED: 'loyalty_adjusted',
  TIER_CHANGED: 'tier_changed',
  REWARD_REDEEMED: 'reward_redeemed',
  REFERRAL_COMPLETED: 'referral_completed',
});

// ==================== CONSENT / MARKETING ====================

export const CONSENT_TYPE = Object.freeze({
  MARKETING_EMAIL: 'marketing_email',
  MARKETING_SMS: 'marketing_sms',
  MARKETING_PUSH: 'marketing_push',
  MARKETING_WHATSAPP: 'marketing_whatsapp',
  DATA_PROCESSING: 'data_processing',
});

// ==================== REDIS KEYS ====================

export const REDIS_KEYS = Object.freeze({
  PROFILE: 'cust:profile', // cust:profile:<customerId>
  LOYALTY: 'cust:loyalty', // cust:loyalty:<customerId>
  REWARDS: 'cust:rewards', // cust:rewards:<restaurantId>
  MERGE_LOCK: 'cust:merge:lock', // per (restaurant,userId) merge serialization
  LOYALTY_LOCK: 'cust:loyalty:lock', // per-customer ledger serialization
  REDEEM_IDEM: 'cust:redeem:idem',
});

// ==================== RBAC ====================

/** `customer` CRUD already exists in the identity core catalog. */
export const CUSTOMER_NEW_PERMISSIONS = Object.freeze([
  { resource: 'customer', action: 'read', description: 'View customers' },
  { resource: 'customer', action: 'manage', description: 'Manage customer accounts' },
  { resource: 'loyalty', action: 'read', description: 'View loyalty accounts & ledgers' },
  { resource: 'loyalty', action: 'adjust', description: 'Manually adjust loyalty points' },
  { resource: 'reward', action: 'read', description: 'View reward catalog' },
  { resource: 'reward', action: 'manage', description: 'Manage the reward catalog' },
  { resource: 'reward', action: 'grant', description: 'Manually grant a reward' },
]);

export const CUSTOMER_PERMISSIONS = Object.freeze({
  CUSTOMER_READ: 'customer:read',
  CUSTOMER_MANAGE: 'customer:manage',
  LOYALTY_READ: 'loyalty:read',
  LOYALTY_ADJUST: 'loyalty:adjust',
  REWARD_READ: 'reward:read',
  REWARD_MANAGE: 'reward:manage',
  REWARD_GRANT: 'reward:grant',
});

// ==================== ERRORS ====================

export const CUSTOMER_ERRORS = Object.freeze({
  CUSTOMER_NOT_FOUND: 'Customer not found',
  NOT_LINKED: 'This action requires a registered customer account. Please sign in first.',
  CROSS_TENANT: 'Resource does not belong to this tenant',
  ADDRESS_NOT_FOUND: 'Address not found',
  LOYALTY_NOT_FOUND: 'Loyalty account not found',
  INSUFFICIENT_POINTS: 'Insufficient loyalty points for this redemption',
  REWARD_NOT_FOUND: 'Reward not found',
  REWARD_INACTIVE: 'This reward is not currently available',
  REWARD_NOT_AFFORDABLE: 'Not enough points to redeem this reward',
  REDEMPTION_NOT_FOUND: 'Redemption not found',
  REFERRAL_NOT_FOUND: 'Referral code not found',
  REFERRAL_SELF: 'You cannot refer yourself',
  INVALID_ADJUSTMENT: 'Invalid loyalty adjustment amount',
  ACCOUNT_INACTIVE: 'Customer account is not active',
});
