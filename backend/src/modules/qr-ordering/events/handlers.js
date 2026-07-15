import { logger } from '#core/logging/logger.js';

import { sessionService } from '../services/session.service.js';

import { QR_EVENTS } from './qr.events.js';

/**
 * Intra-module event subscribers. Observability for key lifecycle transitions,
 * plus the cross-module hooks the gateway exposes WITHOUT coupling:
 *
 *  - A future Order module publishes `order.completed` carrying a `sessionId`;
 *    we complete that session (auto-releasing the table). Subscribing here means
 *    the Order module never needs to know about sessions/tables directly.
 *
 * @param {import('#core/eventbus/event-bus.interface.js').IEventBus} eventBus
 * @param {{ sessionService?: object }} [deps]
 */
export function registerQrEventHandlers(eventBus, deps = {}) {
  const log = logger({ module: 'qr-ordering', component: 'event-handlers' });
  const sessions = deps.sessionService ?? sessionService;

  const observe = (event, msg) =>
    eventBus.subscribe(event, async (payload) => log.info({ payload }, msg), {
      name: `qr.log.${event}`,
    });

  observe(QR_EVENTS.QR_SCANNED, 'qr scanned');
  observe(QR_EVENTS.SESSION_CREATED, 'guest session created');
  observe(QR_EVENTS.SESSION_ENDED, 'guest session ended');
  observe(QR_EVENTS.TABLE_OCCUPIED, 'table occupied');
  observe(QR_EVENTS.TABLE_RELEASED, 'table released');

  // Auto-release-on-order-completion hook. The Order module (future) emits this
  // event; we finalize the referenced session. Defensive: ignores events without
  // a sessionId and never throws into the bus.
  eventBus.subscribe(
    'order.completed',
    async (payload) => {
      const sessionId = payload?.sessionId;
      if (!sessionId) return;
      try {
        await sessions.completeForOrder(sessionId);
      } catch (err) {
        log.warn({ err, sessionId }, 'Auto-complete on order.completed failed');
      }
    },
    { name: 'qr.order-completed.release-table' },
  );
}

export default registerQrEventHandlers;
