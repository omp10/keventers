import { logger } from '#core/logging/logger.js';
import { ORDER_EVENTS } from '#modules/order/index.js';

import { kitchenService } from '../services/kitchen.service.js';

import { KITCHEN_EVENTS } from './kitchen.events.js';

/**
 * Order-event subscribers — the KDS's inbound boundary. The kitchen CONSUMES
 * Order events and never calls the Order service to change order state:
 *
 *  - `order.confirmed` (and the purpose-built `kitchen.queue.requested` seam) →
 *    enqueue a kitchen entry (idempotent by orderId, so both firing is safe).
 *  - `order.cancelled` → cancel the kitchen entry.
 *
 * @param {import('#core/eventbus/event-bus.interface.js').IEventBus} eventBus
 * @param {{ kitchenService?: object }} [deps]
 */
export function registerKitchenEventHandlers(eventBus, deps = {}) {
  const log = logger({ module: 'kitchen', component: 'event-handlers' });
  const kitchen = deps.kitchenService ?? kitchenService;

  const enqueue = async (payload) => {
    if (!payload?.orderId) return;
    try {
      await kitchen.enqueueFromOrder(payload.orderId);
    } catch (err) {
      log.warn({ err, orderId: payload.orderId }, 'Kitchen enqueue failed');
    }
  };

  // Both the domain event and the dedicated seam trigger enqueue (idempotent).
  // PLACED too: a dine-in QR order paying at the counter never gets an online
  // payment confirmation, so waiting for `order.confirmed` left it invisible to
  // the KDS until staff manually confirmed it in the dashboard. The entry starts
  // PENDING either way, and `order.cancelled` already cleans up.
  eventBus.subscribe(ORDER_EVENTS.ORDER_PLACED, enqueue, { name: 'kitchen.on-order-placed' });
  eventBus.subscribe(ORDER_EVENTS.ORDER_CONFIRMED, enqueue, { name: 'kitchen.on-order-confirmed' });
  eventBus.subscribe(ORDER_EVENTS.KITCHEN_QUEUE_REQUESTED, enqueue, { name: 'kitchen.on-queue-requested' });

  eventBus.subscribe(
    ORDER_EVENTS.ORDER_CANCELLED,
    async (payload) => {
      if (!payload?.orderId) return;
      try {
        await kitchen.cancelFromOrder(payload.orderId, payload.reason ?? 'order_cancelled');
      } catch (err) {
        log.warn({ err, orderId: payload.orderId }, 'Kitchen cancel failed');
      }
    },
    { name: 'kitchen.on-order-cancelled' },
  );

  /**
   * Mirror ORDER progress onto the ticket. Advancing from the dashboard used to
   * move the order only, leaving the KDS board showing a stale state — the two
   * screens then disagreed for the rest of that order's life.
   *
   * `syncFromOrder` is a NO-OP when the ticket is already in the target state,
   * which is what stops this closing a loop with the Order module's own
   * `kitchen.order.*` subscribers.
   */
  const syncStatus = (orderStatus) => async (payload) => {
    if (!payload?.orderId) return;
    try {
      await kitchen.syncFromOrder(payload.orderId, orderStatus);
    } catch (err) {
      log.warn({ err, orderId: payload.orderId, orderStatus }, 'Kitchen status sync failed');
    }
  };
  eventBus.subscribe(ORDER_EVENTS.ORDER_PREPARING, syncStatus('preparing'), { name: 'kitchen.on-order-preparing' });
  eventBus.subscribe(ORDER_EVENTS.ORDER_READY, syncStatus('ready'), { name: 'kitchen.on-order-ready' });
  eventBus.subscribe(ORDER_EVENTS.ORDER_SERVED, syncStatus('served'), { name: 'kitchen.on-order-served' });

  // Observability for kitchen lifecycle.
  const observe = (event, msg) =>
    eventBus.subscribe(event, async (p) => log.info({ payload: p }, msg), { name: `kitchen.log.${event}` });
  observe(KITCHEN_EVENTS.ORDER_QUEUED, 'kitchen order queued');
  observe(KITCHEN_EVENTS.ORDER_READY, 'kitchen order ready');
  observe(KITCHEN_EVENTS.SLA_BREACHED, 'kitchen SLA breached');
}

export default registerKitchenEventHandlers;
