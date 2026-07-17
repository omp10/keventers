/**
 * THE CUSTOMER JOURNEY — the canonical event vocabulary, defined ONCE.
 *
 * Every surface emits from this list and nothing invents its own string. That is
 * the whole point: a funnel can only be computed if `product_viewed` means the
 * same thing everywhere and is spelled the same way everywhere. A typo'd or
 * ad-hoc event name doesn't fail loudly — it silently drops out of the funnel and
 * the number quietly reads wrong, which is worse than no number at all.
 *
 * Two consumers, one vocabulary (see `createJourneyAnalytics`):
 *   · Microsoft Clarity — session replay + heatmaps, for watching WHY.
 *   · The platform's own sink — structured events, for aggregating WHAT.
 * Clarity alone can't answer "what % of scans reach payment"; our own events
 * can't show the rage-click that explains it. They're complements.
 *
 * Naming: `<noun>_<past-tense verb>`, lower_snake_case. Past tense because an
 * event is something that ALREADY happened.
 */
export const JOURNEY = {
  // ── Entry ──────────────────────────────────────────────────────────────
  QR_SCANNED: 'qr_scanned',
  OUTLET_IDENTIFIED: 'outlet_identified',
  OTP_STARTED: 'otp_started',
  OTP_REQUESTED: 'otp_requested',
  OTP_SUCCEEDED: 'otp_succeeded',
  OTP_FAILED: 'otp_failed',
  REGISTRATION_COMPLETED: 'registration_completed',
  CUSTOMER_RECOGNIZED: 'customer_recognized',

  // ── Browse ─────────────────────────────────────────────────────────────
  MENU_LOADED: 'menu_loaded',
  BANNER_CLICKED: 'banner_clicked',
  SEARCH_PERFORMED: 'search_performed',
  CATEGORY_VIEWED: 'category_viewed',
  SUBCATEGORY_VIEWED: 'subcategory_viewed',
  PRODUCT_VIEWED: 'product_viewed',
  PRODUCT_OPENED: 'product_opened',
  VARIANT_SELECTED: 'variant_selected',
  ADDON_SELECTED: 'addon_selected',

  // ── Cart ───────────────────────────────────────────────────────────────
  ADDED_TO_CART: 'added_to_cart',
  REMOVED_FROM_CART: 'removed_from_cart',
  CART_VIEWED: 'cart_viewed',
  IMPULSE_ITEM_ADDED: 'impulse_item_added',
  COUPON_APPLIED: 'coupon_applied',
  COUPON_REJECTED: 'coupon_rejected',

  // ── Checkout ───────────────────────────────────────────────────────────
  CHECKOUT_STARTED: 'checkout_started',
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_SUCCEEDED: 'payment_succeeded',
  PAYMENT_FAILED: 'payment_failed',
  ORDER_PLACED: 'order_placed',

  // ── After ──────────────────────────────────────────────────────────────
  ORDER_TRACKED: 'order_tracked',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  ORDER_COLLECTED: 'order_collected',
  FEEDBACK_SUBMITTED: 'feedback_submitted',

  // ── Loyalty ────────────────────────────────────────────────────────────
  LOYALTY_VIEWED: 'loyalty_viewed',
  REWARD_REDEEMED: 'reward_redeemed',
} as const;

export type JourneyEvent = (typeof JOURNEY)[keyof typeof JOURNEY];

/**
 * Properties carried on journey events.
 *
 * `outletId` matters more than it looks: the client runs ~200 outlets, and a
 * funnel that can't be sliced per outlet can't answer the question they'll
 * actually ask ("why does this branch convert worse?"). `createJourneyAnalytics`
 * stamps it on every event rather than trusting each call site to remember.
 *
 * NEVER put personal data here — no phone numbers, names or addresses. These go
 * to third parties. Ids only.
 */
export type JourneyProperties = {
  outletId?: string;
  outletSlug?: string;
  categoryId?: string;
  categorySlug?: string;
  productId?: string;
  productSlug?: string;
  variantId?: string;
  addonId?: string;
  orderId?: string;
  /** Money in MINOR units (paise), matching the backend. */
  value?: number;
  currency?: string;
  quantity?: number;
  couponCode?: string;
  paymentMethod?: string;
  status?: string;
  query?: string;
  isNewCustomer?: boolean;
  [key: string]: unknown;
};
