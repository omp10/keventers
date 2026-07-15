import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { ORDER_EVENTS, orderService } from '#modules/order/index.js';
import { PAYMENT_EVENTS } from '#modules/payment/index.js';
import { QR_EVENTS, sessionService } from '#modules/qr-ordering/index.js';

import { customerAnalyticsService } from '../services/customer-analytics.service.js';
import { customerService } from '../services/customer.service.js';

/**
 * Customer Platform event CONSUMERS. The platform reacts to domain events from
 * Order / Payment / QR — it NEVER calls those services to drive them. Payment and
 * order events carry only ids + scope, so the handler loads the order once via
 * the trusted `getByIdSystem` read seam to resolve the customer + amounts, then
 * updates its own projections. All handlers are defensive: a failure is logged,
 * never thrown back into the publisher.
 *
 * @param {object} [bus]
 * @param {{ analytics?, customers?, orders?, sessions? }} [deps]
 */
export function registerCustomerEventHandlers(bus = sharedEventBus, deps = {}) {
  const log = logger({ module: 'customer', component: 'event-handlers' });
  const analytics = deps.analytics ?? customerAnalyticsService;
  const customers = deps.customers ?? customerService;
  const orders = deps.orders ?? orderService;
  const sessions = deps.sessions ?? sessionService;

  const safe = (name, fn) => async (payload) => {
    try {
      await fn(payload);
    } catch (err) {
      log.warn({ err, event: name, payload }, 'customer event handler failed (continuing)');
    }
  };

  // Guest → Customer link: materialize + merge history (idempotent).
  bus.subscribe(
    QR_EVENTS.SESSION_LINKED_ACCOUNT,
    safe('session.linked_account', async (payload) => {
      if (!payload?.sessionId || !payload?.customerUserId) return;
      const session = await sessions.getPublicSession(payload.sessionId).catch(() => null);
      if (!session?.organizationId || !session?.restaurantId) return;
      const scope = { organizationId: String(session.organizationId), restaurantId: String(session.restaurantId) };
      await customers.linkFromSession(scope, { sessionId: String(payload.sessionId), userId: String(payload.customerUserId) });
    }),
    { name: 'customer.session.linked_account' },
  );

  // OrderCompleted → order/visit/favorites projection.
  bus.subscribe(
    ORDER_EVENTS.ORDER_COMPLETED,
    safe('order.completed', async (payload) => {
      const order = await orders.getByIdSystem(payload.orderId);
      if (order) await analytics.onOrderCompleted(order);
    }),
    { name: 'customer.order.completed' },
  );

  // OrderCancelled → cancelled counter.
  bus.subscribe(
    ORDER_EVENTS.ORDER_CANCELLED,
    safe('order.cancelled', async (payload) => {
      const order = await orders.getByIdSystem(payload.orderId);
      if (order) await analytics.onOrderCancelled(order);
    }),
    { name: 'customer.order.cancelled' },
  );

  // PaymentCaptured → lifetime spend + loyalty earn.
  bus.subscribe(
    PAYMENT_EVENTS.PAYMENT_CAPTURED,
    safe('payment.captured', async (payload) => {
      if (!payload?.orderId) return;
      const order = await orders.getByIdSystem(payload.orderId);
      if (order) await analytics.onPaymentCaptured({ order, amount: payload.amount ?? 0, paymentId: payload.paymentId });
    }),
    { name: 'customer.payment.captured' },
  );

  // RefundCompleted → reduce spend + claw back points.
  bus.subscribe(
    PAYMENT_EVENTS.REFUND_COMPLETED,
    safe('payment.refund_completed', async (payload) => {
      if (!payload?.orderId) return;
      const order = await orders.getByIdSystem(payload.orderId);
      if (order) await analytics.onRefundCompleted({ order, amount: payload.amount ?? 0, refundId: payload.refundId });
    }),
    { name: 'customer.payment.refund_completed' },
  );

  log.info('Customer Platform event handlers registered');
}

export default registerCustomerEventHandlers;
