import { logger } from '#core/logging/logger.js';

import { cartService } from '../services/cart.service.js';

import { CART_EVENTS } from './cart.events.js';

/**
 * Intra-module + cross-module event subscribers. Observability for cart
 * lifecycle, plus the QR-session hooks that keep a cart in step WITHOUT the QR
 * module knowing about carts:
 *
 *  - `session.linked_account` → link the customer to the active cart (history
 *    preserved), so anonymous ordering upgrades cleanly to a logged-in account.
 *  - `session.ended` → abandon the active cart and free its cache.
 *
 * @param {import('#core/eventbus/event-bus.interface.js').IEventBus} eventBus
 * @param {{ cartService?: object }} [deps]
 */
export function registerCartEventHandlers(eventBus, deps = {}) {
  const log = logger({ module: 'cart', component: 'event-handlers' });
  const carts = deps.cartService ?? cartService;

  const observe = (event, msg) =>
    eventBus.subscribe(event, async (payload) => log.info({ payload }, msg), { name: `cart.log.${event}` });

  observe(CART_EVENTS.CART_CREATED, 'cart created');
  observe(CART_EVENTS.CART_CONVERTED, 'cart converted to order');
  observe(CART_EVENTS.CART_EXPIRED, 'cart expired');

  eventBus.subscribe(
    'session.linked_account',
    async (payload) => {
      if (!payload?.sessionId || !payload?.customerUserId) return;
      try {
        await carts.linkCustomerBySession(payload.sessionId, payload.customerUserId);
      } catch (err) {
        log.warn({ err, sessionId: payload.sessionId }, 'Link customer to cart failed');
      }
    },
    { name: 'cart.session-linked.link-customer' },
  );

  eventBus.subscribe(
    'session.ended',
    async (payload) => {
      if (!payload?.sessionId) return;
      try {
        await carts.abandonBySession(payload.sessionId, payload.reason ?? 'session_ended');
      } catch (err) {
        log.warn({ err, sessionId: payload.sessionId }, 'Abandon cart on session end failed');
      }
    },
    { name: 'cart.session-ended.abandon-cart' },
  );
}

export default registerCartEventHandlers;
