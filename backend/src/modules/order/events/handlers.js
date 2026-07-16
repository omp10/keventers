import { logger } from '#core/logging/logger.js';

import { ORDER_STATUS } from '../constants/order.constants.js';
import { orderService } from '../services/order.service.js';

import { ORDER_EVENTS } from './order.events.js';

/**
 * Intra-module + cross-module event subscribers. Observability for order
 * lifecycle, plus the guest-session hook that keeps orders in step:
 *
 *  - `session.linked_account` → backfill `customerUserId` on the session's
 *    orders when an anonymous guest logs in — history preserved, no coupling.
 *  - `kitchen.order.{preparing,ready,served}` → mirror the KDS's progress onto
 *    the order, so the customer's tracker actually moves. This is the return
 *    leg of the seam whose outbound half is `order.confirmed → kitchen enqueue`;
 *    both directions stay event-driven, so neither module calls the other.
 *
 * Future Payments / Analytics / Loyalty / Notifications modules subscribe to the
 * ORDER events (published by the service) rather than calling it directly.
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

  // Kitchen → order status mirror. Kitchen statuses share their names with the
  // order's, so the map is 1:1; recall/refire are deliberately NOT mirrored
  // (the board pulls a dish back without moving the customer's order backwards).
  const KITCHEN_TO_ORDER = {
    'kitchen.order.preparing': ORDER_STATUS.PREPARING,
    'kitchen.order.ready': ORDER_STATUS.READY,
    'kitchen.order.served': ORDER_STATUS.SERVED,
  };

  for (const [event, toStatus] of Object.entries(KITCHEN_TO_ORDER)) {
    eventBus.subscribe(
      event,
      async (payload) => {
        if (!payload?.orderId) return;
        try {
          await orders.syncFromKitchen(payload.orderId, toStatus);
        } catch (err) {
          log.warn({ err, orderId: payload.orderId, toStatus }, 'Kitchen→order status sync failed');
        }
      },
      { name: `order.on-${event}` },
    );
  }

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
