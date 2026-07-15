import { InMemoryEventBus } from './in-memory-event-bus.js';

export { DomainEvent } from './domain-event.js';
export { EventRegistry } from './event-registry.js';
export { EventDispatcher } from './event-dispatcher.js';
export { EventSerializer } from './event-serializer.js';
export { withRetry } from './retry-strategy.js';
export { deadLetterQueue, InMemoryDeadLetterQueue } from './dead-letter.js';
export { AbstractEventBus } from './event-bus.interface.js';
export { InMemoryEventBus } from './in-memory-event-bus.js';
export { buildEventMetadata } from './event-metadata.js';

/**
 * The application's shared event bus (in-process). The composition root
 * registers this in the DI container; swapping implementations later is a
 * single change here + container binding.
 * @type {import('./event-bus.interface.js').IEventBus}
 */
export const eventBus = new InMemoryEventBus();

export default eventBus;
