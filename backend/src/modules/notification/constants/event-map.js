import { CATEGORY, CHANNEL, PRIORITY, TEMPLATE_KEY, AUDIENCE } from './notification.constants.js';

/**
 * Declarative routing from a consumed DOMAIN EVENT to a notification SPEC
 * (template + category + default channels + priority + audience). The event
 * handlers enrich each event (resolving recipient + variables via trusted read
 * seams) and hand the spec to the outbox — so ADD a notification for a new event
 * by adding a row here, not by touching delivery logic.
 *
 * `channels` are the DEFAULT candidate channels; the actual set is intersected
 * with the recipient's per-category PREFERENCES at dispatch time (in-app is
 * always kept as the durable inbox record; mandatory categories bypass opt-out).
 */
export const EVENT_NOTIFICATION_MAP = Object.freeze({
  // ---- Organization ----
  'restaurant.activated': { template: TEMPLATE_KEY.RESTAURANT_APPROVED, category: CATEGORY.SYSTEM, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.EMAIL], audience: AUDIENCE.RESTAURANT },
  'organization.approved': { template: TEMPLATE_KEY.RESTAURANT_APPROVED, category: CATEGORY.SYSTEM, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.EMAIL], audience: AUDIENCE.RESTAURANT },

  // ---- Customer ----
  'customer.created': { template: TEMPLATE_KEY.WELCOME, category: CATEGORY.SYSTEM, priority: PRIORITY.NORMAL, channels: [CHANNEL.IN_APP, CHANNEL.EMAIL], audience: AUDIENCE.CUSTOMER },
  'customer.merged': { template: TEMPLATE_KEY.CUSTOMER_REGISTERED, category: CATEGORY.SYSTEM, priority: PRIORITY.LOW, channels: [CHANNEL.IN_APP], audience: AUDIENCE.CUSTOMER },

  // ---- Orders ----
  'order.placed': { template: TEMPLATE_KEY.ORDER_PLACED, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.PUSH], audience: AUDIENCE.CUSTOMER },
  'order.confirmed': { template: TEMPLATE_KEY.ORDER_CONFIRMED, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.PUSH], audience: AUDIENCE.CUSTOMER },
  'order.preparing': { template: TEMPLATE_KEY.ORDER_PREPARING, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.NORMAL, channels: [CHANNEL.IN_APP, CHANNEL.PUSH], audience: AUDIENCE.CUSTOMER },
  'order.ready': { template: TEMPLATE_KEY.ORDER_READY, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.PUSH, CHANNEL.SMS], audience: AUDIENCE.CUSTOMER },
  'order.completed': { template: TEMPLATE_KEY.ORDER_COMPLETED, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.NORMAL, channels: [CHANNEL.IN_APP], audience: AUDIENCE.CUSTOMER },

  // ---- Kitchen (order ready from the KDS) ----
  'kitchen.order.ready': { template: TEMPLATE_KEY.ORDER_READY, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.PUSH], audience: AUDIENCE.CUSTOMER },

  // ---- Payments ----
  'payment.captured': { template: TEMPLATE_KEY.PAYMENT_SUCCESS, category: CATEGORY.PAYMENTS, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.EMAIL], audience: AUDIENCE.CUSTOMER },
  'payment.failed': { template: TEMPLATE_KEY.PAYMENT_FAILED, category: CATEGORY.PAYMENTS, priority: PRIORITY.CRITICAL, channels: [CHANNEL.IN_APP, CHANNEL.PUSH, CHANNEL.SMS], audience: AUDIENCE.CUSTOMER },
  'payment.refund_completed': { template: TEMPLATE_KEY.REFUND_COMPLETED, category: CATEGORY.PAYMENTS, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.EMAIL], audience: AUDIENCE.CUSTOMER },

  // ---- Loyalty ----
  'customer.loyalty.earned': { template: TEMPLATE_KEY.LOYALTY_EARNED, category: CATEGORY.LOYALTY, priority: PRIORITY.LOW, channels: [CHANNEL.IN_APP], audience: AUDIENCE.CUSTOMER },
  'customer.tier.changed': { template: TEMPLATE_KEY.TIER_UPGRADED, category: CATEGORY.LOYALTY, priority: PRIORITY.NORMAL, channels: [CHANNEL.IN_APP, CHANNEL.PUSH], audience: AUDIENCE.CUSTOMER },
});

/**
 * STAFF / KITCHEN notifications — a SEPARATE map because the same event has to
 * reach two different audiences saying two different things: `order.ready` tells
 * the diner "come and collect it" and the waiter "carry it out". Keying one map
 * by event name could only ever express one of those.
 *
 * These are PUSH-first by design. Staff already get Socket.IO updates while the
 * app is on screen; the entire point here is reaching a phone that is in a
 * pocket or a tablet that has gone to sleep.
 */
export const STAFF_EVENT_NOTIFICATION_MAP = Object.freeze({
  // A new order landing is the one every kitchen must never miss.
  'order.placed': { template: TEMPLATE_KEY.STAFF_ORDER_NEW, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.CRITICAL, channels: [CHANNEL.IN_APP, CHANNEL.PUSH], audience: AUDIENCE.STAFF, target: 'branch' },
  // Ready = someone has to carry it to the table.
  'kitchen.order.ready': { template: TEMPLATE_KEY.STAFF_ORDER_READY, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.PUSH], audience: AUDIENCE.STAFF, target: 'branch' },
  // A breach is an escalation — the whole branch should see it.
  'kitchen.sla.breached': { template: TEMPLATE_KEY.STAFF_SLA_BREACHED, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.CRITICAL, channels: [CHANNEL.IN_APP, CHANNEL.PUSH], audience: AUDIENCE.STAFF, target: 'branch' },
  // Assignment is personal: it goes to the ONE chef, not the whole floor.
  'kitchen.order.assigned': { template: TEMPLATE_KEY.STAFF_ORDER_ASSIGNED, category: CATEGORY.ORDER_UPDATES, priority: PRIORITY.HIGH, channels: [CHANNEL.IN_APP, CHANNEL.PUSH], audience: AUDIENCE.STAFF, target: 'assignee' },
});

/** Every event name the Notification Engine subscribes to (both audiences). */
export const CONSUMED_EVENTS = Object.freeze([
  ...new Set([...Object.keys(EVENT_NOTIFICATION_MAP), ...Object.keys(STAFF_EVENT_NOTIFICATION_MAP)]),
]);

export function specForEvent(eventName) {
  return EVENT_NOTIFICATION_MAP[eventName] ?? null;
}

/** The staff-facing spec for an event, if it has one. */
export function staffSpecForEvent(eventName) {
  return STAFF_EVENT_NOTIFICATION_MAP[eventName] ?? null;
}
