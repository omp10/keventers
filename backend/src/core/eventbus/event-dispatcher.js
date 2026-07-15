import { config } from '#config';
import { logger } from '#core/logging/logger.js';

import { deadLetterQueue } from './dead-letter.js';
import { withRetry } from './retry-strategy.js';

/**
 * Delivers a published event to every registered handler, independently, with
 * per-handler retry. A handler that exhausts its retries is dead-lettered — it
 * never blocks sibling handlers or the publisher.
 */
export class EventDispatcher {
  /**
   * @param {object} deps
   * @param {import('./event-registry.js').EventRegistry} deps.registry
   * @param {import('./dead-letter.js').InMemoryDeadLetterQueue} [deps.dlq]
   */
  constructor({ registry, dlq = deadLetterQueue }) {
    this.registry = registry;
    this.dlq = dlq;
  }

  /**
   * @param {{ name: string, payload: unknown }} event
   */
  async dispatch(event) {
    const handlers = this.registry.getHandlers(event.name);
    if (handlers.length === 0) {
      logger().debug({ event: event.name }, 'No handlers for event');
      return;
    }

    // Handlers run in parallel; each isolates its own failures.
    await Promise.all(
      handlers.map(({ name, handler }) => this.#runHandler(event, name, handler)),
    );
  }

  async #runHandler(event, handlerName, handler) {
    try {
      await withRetry(() => handler(event.payload, event), {
        retries: config.events.maxRetries,
        backoffMs: config.events.retryBackoffMs,
        onRetry: (err, attempt) =>
          logger().warn(
            { event: event.name, handler: handlerName, attempt, err },
            'Retrying event handler',
          ),
      });
    } catch (err) {
      await this.dlq.add({ event, handlerName, error: err });
    }
  }
}

export default EventDispatcher;
