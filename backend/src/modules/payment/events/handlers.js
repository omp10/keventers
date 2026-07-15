import { logger } from '#core/logging/logger.js';
import { ORDER_EVENTS } from '#modules/order/index.js';

import { paymentIntentService } from '../services/payment-intent.service.js';

import { PAYMENT_EVENTS } from './payment.events.js';

/**
 * Payment event wiring. The Payment Engine communicates OUTWARD only through its
 * provider-independent domain events (Order/Kitchen/Notifications/Analytics/
 * Loyalty subscribe to these). Inbound, it defensively consumes `order.cancelled`
 * to cancel any still-open payment intents — never manipulating the order.
 *
 * @param {import('#core/eventbus/event-bus.interface.js').IEventBus} eventBus
 * @param {{ paymentIntentService?: object }} [deps]
 */
export function registerPaymentEventHandlers(eventBus, deps = {}) {
  const log = logger({ module: 'payment', component: 'event-handlers' });
  const intents = deps.paymentIntentService ?? paymentIntentService;

  const observe = (event, msg) =>
    eventBus.subscribe(event, async (p) => log.info({ payload: p }, msg), { name: `payment.log.${event}` });

  observe(PAYMENT_EVENTS.INTENT_CREATED, 'payment intent created');
  observe(PAYMENT_EVENTS.PAYMENT_CAPTURED, 'payment captured');
  observe(PAYMENT_EVENTS.PAYMENT_FAILED, 'payment failed');
  observe(PAYMENT_EVENTS.REFUND_COMPLETED, 'refund completed');
  observe(PAYMENT_EVENTS.SETTLEMENT_CREATED, 'settlement created');

  eventBus.subscribe(
    ORDER_EVENTS.ORDER_CANCELLED,
    async (payload) => {
      if (!payload?.orderId) return;
      try {
        await intents.cancelForOrder(payload.orderId);
      } catch (err) {
        log.warn({ err, orderId: payload.orderId }, 'Cancel open intents on order cancel failed');
      }
    },
    { name: 'payment.on-order-cancelled' },
  );
}

export default registerPaymentEventHandlers;
