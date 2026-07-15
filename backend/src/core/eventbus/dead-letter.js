import { logger } from '#core/logging/logger.js';

import { EventSerializer } from './event-serializer.js';

/**
 * Dead-letter abstraction. Events whose handlers exhaust all retries are routed
 * here for later inspection / replay. The interface is what matters — the
 * default is an in-memory sink (dev-safe); production can bind a Redis- or
 * broker-backed implementation without changing the dispatcher.
 *
 * @typedef {object} IDeadLetterQueue
 * @property {(entry: DeadLetterEntry) => Promise<void>} add
 * @property {() => Promise<DeadLetterEntry[]>} list
 * @property {() => Promise<void>} clear
 *
 * @typedef {object} DeadLetterEntry
 * @property {string} eventName
 * @property {string} handlerName
 * @property {string} serializedEvent
 * @property {string} error
 * @property {string} failedAt
 */
export class InMemoryDeadLetterQueue {
  #entries = [];

  async add({ event, handlerName, error }) {
    const entry = {
      eventName: event?.name ?? 'unknown',
      handlerName,
      serializedEvent: EventSerializer.serialize(event),
      error: error?.message ?? String(error),
      failedAt: new Date().toISOString(),
    };
    this.#entries.push(entry);
    logger().error({ entry }, 'Event routed to dead-letter queue');
  }

  async list() {
    return [...this.#entries];
  }

  async clear() {
    this.#entries = [];
  }
}

export const deadLetterQueue = new InMemoryDeadLetterQueue();
export default deadLetterQueue;
