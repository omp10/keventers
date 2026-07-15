import { logger } from '#core/logging/logger.js';

import { deadLetterQueue } from './dead-letter.js';
import { EventDispatcher } from './event-dispatcher.js';
import { EventRegistry } from './event-registry.js';
import { AbstractEventBus } from './event-bus.interface.js';

/**
 * Default, in-process IEventBus implementation.
 *
 * publish() returns as soon as delivery is scheduled — handlers run
 * asynchronously so a slow/failing subscriber never blocks the caller. This
 * mirrors broker semantics and keeps the swap-to-Kafka/RabbitMQ path clean.
 */
export class InMemoryEventBus extends AbstractEventBus {
  constructor({ registry = new EventRegistry(), dlq = deadLetterQueue } = {}) {
    super();
    this.registry = registry;
    this.dispatcher = new EventDispatcher({ registry, dlq });
  }

  subscribe(eventName, handler, options) {
    this.registry.register(eventName, handler, options);
    return this;
  }

  unsubscribe(eventName) {
    this.registry.unregister(eventName);
  }

  /**
   * @param {{ name: string, payload: unknown }} event
   */
  async publish(event) {
    if (!event?.name) throw new Error('Event must have a name');
    logger().debug({ event: event.name }, 'Event published');

    // Fire-and-forget dispatch; failures are retried & dead-lettered internally.
    queueMicrotask(() => {
      this.dispatcher.dispatch(event).catch((err) => {
        logger().error({ err, event: event.name }, 'Event dispatch failed unexpectedly');
      });
    });
  }
}

export default InMemoryEventBus;
