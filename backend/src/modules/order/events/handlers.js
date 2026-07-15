import { logger } from '#core/logging/logger.js';

import { orderService } from '../services/order.service.js';

import { ORDER_EVENTS } from './order.events.js';

/**
 * Intra-module + cross-module event subscribers. Observability for order
 * lifecycle, plus the guest-session hook that keeps orders in step:
 *
 *  - `session.linked_account` → backfill `customerUserId` on the session's
 *    orders when an anonymous guest logs in — history preserved, no coupling.
 *
 * Future Kitchen / Payments / Analytics / Loyalty / Notifications modules
 * subscribe to the ORDER events (published by the service) rather than calling
 * the service directly.
 *
 * @param {import('#core/eventbus/event-bus.interface.js').IEventBus} eventBus
 * @param {{ orderService?: object }} [deps]
 */
export function registerOrderEventHandlers(eventBus, deps = {}) {
  const log = logger({ module: 'order', component: 'event-handlers' });
  const orders = deps.orderService ?? orderService;

  const observe = (event, msg) =>
    eventBus.subscribe(event, async (payload) => log.info({ payload }, msg), { name: `order.log.${event}` });

  observe(ORDER_EVENTS.ORDER_PLACED, 'order placed');
  observe(ORDER_EVENTS.ORDER_CONFIRMED, 'order confirmed');
  observe(ORDER_EVENTS.ORDER_COMPLETED, 'order completed');
  observe(ORDER_EVENTS.ORDER_CANCELLED, 'order cancelled');
  observe(ORDER_EVENTS.KITCHEN_QUEUE_REQUESTED, 'kitchen queue entry requested');

  eventBus.subscribe(
    'session.linked_account',
    async (payload) => {
      if (!payload?.sessionId || !payload?.customerUserId) return;
      try {
        await orders.linkCustomerBySession(payload.sessionId, payload.customerUserId);
      } catch (err) {
        log.warn({ err, sessionId: payload.sessionId }, 'Link customer to orders failed');
      }
    },
    { name: 'order.session-linked.link-customer' },
  );
}

export default registerOrderEventHandlers;
