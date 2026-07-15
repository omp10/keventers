import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { orderService } from '#modules/order/index.js';

import { CONSUMED_EVENTS, specForEvent } from '../constants/event-map.js';
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
    if (!router) continue;
    bus.subscribe(
      eventName,
      async (payload) => {
        try {
          const request = await router(eventName, payload);
          if (request) await enqueue(request);
        } catch (err) {
          log.warn({ err, event: eventName }, 'notification handler failed (continuing)');
        }
      },
      { name: `notification.on.${eventName}` },
    );
  }

  log.info({ events: CONSUMED_EVENTS.length }, 'Notification event handlers registered');
}

export default registerNotificationEventHandlers;
