import { CATEGORY, TEMPLATE_KEY } from './notification.constants.js';

/**
 * Built-in PLATFORM-GLOBAL default templates. These are (a) seeded as global
 * templates by the seeder and (b) used as an in-memory FALLBACK by the template
 * service so a notification never fails for a missing template. Restaurants can
 * override any of these with a scoped template. `{{ tokens }}` are filled from
 * the event variables. English (`en`) defaults; localize by adding scoped rows.
 */
export const DEFAULT_TEMPLATES = Object.freeze({
  [TEMPLATE_KEY.WELCOME]: { category: CATEGORY.SYSTEM, subject: 'Welcome to {{ restaurantName }}!', body: 'Hi {{ name }}, welcome to {{ restaurantName }}. Scan, order and earn rewards on every visit.' },
  [TEMPLATE_KEY.CUSTOMER_REGISTERED]: { category: CATEGORY.SYSTEM, subject: 'Your account is ready', body: 'Hi {{ name }}, your {{ restaurantName }} account is now linked. Your order history and points are saved.' },
  [TEMPLATE_KEY.GUEST_LINKED]: { category: CATEGORY.SYSTEM, subject: 'Account linked', body: 'Your session is now linked to your account.' },
  [TEMPLATE_KEY.ORDER_PLACED]: { category: CATEGORY.ORDER_UPDATES, subject: 'Order {{ orderNumber }} placed', body: 'Thanks {{ name }}! We received order {{ orderNumber }}. We will confirm it shortly.' },
  [TEMPLATE_KEY.ORDER_CONFIRMED]: { category: CATEGORY.ORDER_UPDATES, subject: 'Order {{ orderNumber }} confirmed', body: 'Your order {{ orderNumber }} is confirmed and going to the kitchen.' },
  [TEMPLATE_KEY.ORDER_PREPARING]: { category: CATEGORY.ORDER_UPDATES, subject: 'Order {{ orderNumber }} is being prepared', body: 'Good news — {{ restaurantName }} is preparing order {{ orderNumber }}.' },
  [TEMPLATE_KEY.ORDER_READY]: { category: CATEGORY.ORDER_UPDATES, subject: 'Order {{ orderNumber }} is ready', body: 'Order {{ orderNumber }} is ready! Please collect it at the counter.' },
  [TEMPLATE_KEY.ORDER_COMPLETED]: { category: CATEGORY.ORDER_UPDATES, subject: 'Order {{ orderNumber }} completed', body: 'Enjoy! Order {{ orderNumber }} is complete. Thanks for choosing {{ restaurantName }}.' },
  [TEMPLATE_KEY.PAYMENT_SUCCESS]: { category: CATEGORY.PAYMENTS, subject: 'Payment received', body: 'We received your payment of {{ amount }} for order {{ orderNumber }}. Thank you!' },
  [TEMPLATE_KEY.PAYMENT_FAILED]: { category: CATEGORY.PAYMENTS, subject: 'Payment failed', body: 'Your payment for order {{ orderNumber }} could not be processed. Please try again.' },
  [TEMPLATE_KEY.REFUND_COMPLETED]: { category: CATEGORY.PAYMENTS, subject: 'Refund processed', body: 'Your refund of {{ amount }} for order {{ orderNumber }} has been processed.' },
  [TEMPLATE_KEY.LOYALTY_EARNED]: { category: CATEGORY.LOYALTY, subject: 'You earned {{ points }} points', body: 'You earned {{ points }} points at {{ restaurantName }}. Balance: {{ balance }} points.' },
  [TEMPLATE_KEY.TIER_UPGRADED]: { category: CATEGORY.LOYALTY, subject: 'You reached {{ tier }} tier!', body: 'Congratulations {{ name }} — you are now a {{ tier }} member at {{ restaurantName }}.' },
  [TEMPLATE_KEY.RESTAURANT_APPROVED]: { category: CATEGORY.SYSTEM, subject: 'Your restaurant is approved', body: '{{ restaurantName }} has been approved and is now live on Keventers.' },
});

/** Fallback lookup used by the template service when no DB template exists. */
export function defaultTemplateFor(key) {
  return DEFAULT_TEMPLATES[key] ?? null;
}
