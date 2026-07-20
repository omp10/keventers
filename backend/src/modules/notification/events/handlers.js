import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { orderService } from '#modules/order/index.js';

import { CONSUMED_EVENTS, specForEvent, staffSpecForEvent } from '../constants/event-map.js';
import { dedupeKey } from '../utils/dedupe.util.js';
import { outboxService } from '../services/outbox.service.js';

/**
 * Notification event CONSUMERS. The engine reacts to domain events already
 * published by Order / Payment / Kitchen / Customer / Organization — it NEVER
 * calls those services to drive them. Order/payment events carry only ids + scope,
 * so the handler enriches via the Order module's trusted `getByIdSystem` read
 * seam to resolve the recipient + template variables, then persists ONE outbox
 * row (the transactional outbox). Every handler is defensive: a failure is logged,
 * never thrown back into the publisher.
 */
export function registerNotificationEventHandlers(bus = sharedEventBus, deps = {}) {
  const log = logger({ module: 'notification', component: 'event-handlers' });
  const outbox = deps.outbox ?? outboxService;
  const orders = deps.orders ?? orderService;

  const enqueue = (req) => outbox.enqueueFromEvent(req);

  /** Build a customer-order notification request from an order event. */
  async function orderRequest(eventName, payload) {
    const spec = specForEvent(eventName);
    if (!spec || !payload?.orderId) return null;
    const order = await orders.getByIdSystem(payload.orderId).catch(() => null);
    if (!order) return null;
    const scope = { organizationId: String(order.organizationId), restaurantId: String(order.restaurantId), branchId: order.branchId ? String(order.branchId) : null };
    const recipientKey = order.customerUserId ? String(order.customerUserId) : String(order.sessionId ?? '');
    return {
      scope,
      eventName,
      templateKey: spec.template,
      category: spec.category,
      priority: spec.priority,
      audience: spec.audience,
      channels: spec.channels,
      recipient: { userId: order.customerUserId ?? null, customerId: null, sessionId: order.sessionId ?? null },
      variables: { orderNumber: order.orderNumber, name: order.customerName ?? 'there', restaurantName: order.restaurantName ?? 'the restaurant', total: order.pricing?.total?.amount ?? null },
      data: { orderId: String(order.id ?? order._id), orderNumber: order.orderNumber, kind: 'order', status: order.status },
      dedupeKey: dedupeKey(eventName, recipientKey, `${payload.orderId}:${eventName}`),
    };
  }

  /**
   * STAFF / KITCHEN notifications — a FAN-OUT, not a single recipient.
   *
   * A customer notification has one obvious addressee; "a new order arrived" has
   * to reach whoever is on the floor. So this resolves the people who actually
   * reach this branch and returns ONE outbox row each: every staff member then
   * gets their own preference check, their own dedupe key and their own delivery
   * retry, exactly like a customer would. One row addressed to a group would
   * have none of that.
   *
   * `target: 'assignee'` is the exception — being handed an order is personal,
   * so it goes to that chef alone rather than buzzing the whole kitchen.
   */
  async function staffRequests(eventName, payload) {
    const spec = staffSpecForEvent(eventName);
    if (!spec || !payload?.orderId) return [];
    const order = await orders.getByIdSystem(payload.orderId).catch(() => null);
    if (!order) return [];

    const scope = {
      organizationId: String(order.organizationId),
      restaurantId: String(order.restaurantId),
      branchId: order.branchId ? String(order.branchId) : null,
    };

    let userIds = [];
    if (spec.target === 'assignee') {
      const chefId = payload.chefId ?? payload.assignment?.currentChefId ?? null;
      userIds = chefId ? [String(chefId)] : [];
    } else {
      const { staffService } = await import('#modules/organization/index.js');
      const staff = await staffService.listForBranchSystem(scope).catch(() => []);
      userIds = [...new Set(staff.map((m) => String(m.userId ?? m.user?.id ?? '')).filter(Boolean))];
    }
    if (!userIds.length) return [];

    // The order stores only `tableId`, but "Table 10" is the single most useful
    // token on a busy floor — resolve it rather than shipping "the counter".
    const tableLabel = order.tableLabel ?? order.table?.name ?? order.table?.number ?? null;

    const variables = {
      orderNumber: order.orderNumber,
      tableLabel: tableLabel ?? 'the counter',
      itemCount: order.itemCount ?? (order.items?.length ?? 0),
      restaurantName: order.restaurantName ?? 'the restaurant',
    };
    // Deep-link staff straight at the board rather than the customer app.
    const data = { orderId: String(order.id ?? order._id), orderNumber: order.orderNumber, kind: 'staff_order', link: '/kitchen/orders' };

    return userIds.map((userId) => ({
      scope,
      eventName,
      templateKey: spec.template,
      category: spec.category,
      priority: spec.priority,
      audience: spec.audience,
      channels: spec.channels,
      recipient: { userId, role: 'staff' },
      variables,
      data,
      // Per-recipient: two staff must not dedupe each other out.
      dedupeKey: dedupeKey(eventName, userId, `${payload.orderId}:${eventName}:staff`),
    }));
  }

  /** Payment/refund notification (enriches the order for recipient + amount). */
  async function paymentRequest(eventName, payload) {
    const spec = specForEvent(eventName);
    if (!spec || !payload?.orderId) return null;
    const order = await orders.getByIdSystem(payload.orderId).catch(() => null);
    if (!order) return null;
    const scope = { organizationId: String(order.organizationId), restaurantId: String(order.restaurantId), branchId: order.branchId ? String(order.branchId) : null };
    const recipientKey = order.customerUserId ? String(order.customerUserId) : String(order.sessionId ?? '');
    const naturalId = payload.paymentId ?? payload.refundId ?? `${payload.orderId}:${eventName}`;
    return {
      scope,
      eventName,
      templateKey: spec.template,
      category: spec.category,
      priority: spec.priority,
      audience: spec.audience,
      channels: spec.channels,
      recipient: { userId: order.customerUserId ?? null, sessionId: order.sessionId ?? null },
      variables: { orderNumber: order.orderNumber, amount: (payload.amount ?? 0) / 100, restaurantName: order.restaurantName ?? 'the restaurant' },
      data: { orderId: String(payload.orderId), kind: 'payment' },
      dedupeKey: dedupeKey(eventName, recipientKey, String(naturalId)),
    };
  }

  /** Loyalty/tier notification (payload already carries customer + points). */
  function loyaltyRequest(eventName, payload) {
    const spec = specForEvent(eventName);
    if (!spec || !payload?.customerId || !payload?.restaurantId) return null;
    const scope = { organizationId: payload.organizationId ? String(payload.organizationId) : null, restaurantId: String(payload.restaurantId) };
    if (!scope.organizationId) return null; // need org for tenant scope
    // Stable natural id (NO Date.now — a replayed event must dedupe to the same
    // outbox row). Loyalty earn is 1:1 with an order/points-balance snapshot.
    const naturalId = eventName === 'customer.tier.changed'
      ? `${payload.customerId}:${payload.toTier}`
      : `${payload.customerId}:${payload.orderId ?? ''}:${payload.balance ?? payload.points}`;
    return {
      scope,
      eventName,
      templateKey: spec.template,
      category: spec.category,
      priority: spec.priority,
      audience: spec.audience,
      channels: spec.channels,
      recipient: { userId: payload.userId ?? null, customerId: payload.customerId },
      variables: { points: payload.points ?? null, balance: payload.balance ?? null, tier: payload.toTier ?? null, name: 'there', restaurantName: 'the restaurant' },
      data: { kind: 'loyalty' },
      dedupeKey: dedupeKey(eventName, String(payload.customerId), naturalId),
    };
  }

  /** Customer welcome (customer.created carries scope + userId). */
  function customerRequest(eventName, payload) {
    const spec = specForEvent(eventName);
    if (!spec || !payload?.customerId || !payload?.restaurantId || !payload?.organizationId) return null;
    const scope = { organizationId: String(payload.organizationId), restaurantId: String(payload.restaurantId) };
    return {
      scope,
      eventName,
      templateKey: spec.template,
      category: spec.category,
      priority: spec.priority,
      audience: spec.audience,
      channels: spec.channels,
      recipient: { userId: payload.userId ?? null, customerId: payload.customerId },
      variables: { name: 'there', restaurantName: 'the restaurant' },
      data: { kind: 'account' },
      dedupeKey: dedupeKey(eventName, String(payload.customerId), String(payload.customerId)),
    };
  }

  /** Restaurant approved (org event). */
  function restaurantRequest(eventName, payload) {
    const spec = specForEvent(eventName);
    if (!spec || !payload?.restaurantId || !payload?.organizationId) return null;
    const scope = { organizationId: String(payload.organizationId), restaurantId: String(payload.restaurantId) };
    return {
      scope,
      eventName,
      templateKey: spec.template,
      category: spec.category,
      priority: spec.priority,
      audience: spec.audience,
      channels: spec.channels,
      recipient: { userId: payload.ownerUserId ?? payload.userId ?? null, role: 'restaurant', email: payload.ownerEmail ?? null },
      variables: { restaurantName: payload.name ?? payload.restaurantName ?? 'Your restaurant' },
      data: { kind: 'restaurant' },
      dedupeKey: dedupeKey(eventName, String(payload.restaurantId), String(payload.restaurantId)),
    };
  }

  const ROUTERS = {
    'order.placed': orderRequest,
    'order.confirmed': orderRequest,
    'order.preparing': orderRequest,
    'order.ready': orderRequest,
    'order.completed': orderRequest,
    'kitchen.order.ready': orderRequest,
    'payment.captured': paymentRequest,
    'payment.failed': paymentRequest,
    'payment.refund_completed': paymentRequest,
    'customer.loyalty.earned': loyaltyRequest,
    'customer.tier.changed': loyaltyRequest,
    'customer.created': customerRequest,
    'customer.merged': customerRequest,
    'restaurant.activated': restaurantRequest,
    'organization.approved': restaurantRequest,
  };

  for (const eventName of CONSUMED_EVENTS) {
    const router = ROUTERS[eventName];
    const notifiesStaff = Boolean(staffSpecForEvent(eventName));
    if (!router && !notifiesStaff) continue;
    bus.subscribe(
      eventName,
      async (payload) => {
        // The two audiences are enqueued INDEPENDENTLY: a failure resolving the
        // staff roster must never cost the customer their order update.
        if (router) {
          try {
            const request = await router(eventName, payload);
            if (request) await enqueue(request);
          } catch (err) {
            log.warn({ err, event: eventName }, 'notification handler failed (continuing)');
          }
        }
        if (notifiesStaff) {
          try {
            for (const request of await staffRequests(eventName, payload)) await enqueue(request);
          } catch (err) {
            log.warn({ err, event: eventName }, 'staff notification handler failed (continuing)');
          }
        }
      },
      { name: `notification.on.${eventName}` },
    );
  }

  log.info({ events: CONSUMED_EVENTS.length }, 'Notification event handlers registered');
}

export default registerNotificationEventHandlers;
