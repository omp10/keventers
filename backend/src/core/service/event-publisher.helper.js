import { eventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';

/**
 * Event-publishing facade for the service layer. Business services publish
 * domain events through this helper rather than importing the bus directly,
 * keeping the transport swappable and publication uniformly logged.
 */
export function createEventPublisher(bus = eventBus) {
  return {
    /**
     * @param {{ name: string, payload: unknown } | import('#core/eventbus/domain-event.js').DomainEvent} event
     */
    async publish(event) {
      await bus.publish(event);
      logger().debug({ event: event.name }, 'Domain event dispatched');
    },

    /** Publish several events (order preserved). */
    async publishMany(events = []) {
      for (const event of events) await bus.publish(event);
    },
  };
}

export const eventPublisher = createEventPublisher();
export default eventPublisher;
