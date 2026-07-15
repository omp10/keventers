import { logger } from '#core/logging/logger.js';

/**
 * Maps event names → ordered list of subscribed handlers. Handlers are plain
 * async functions `(payload, event) => Promise<void>` with an attached name for
 * diagnostics / dead-lettering.
 *
 * @typedef {(payload: unknown, event: object) => Promise<void>} EventHandler
 */
export class EventRegistry {
  /** @type {Map<string, {name: string, handler: EventHandler}[]>} */
  #handlers = new Map();

  /**
   * @param {string} eventName
   * @param {EventHandler} handler
   * @param {object} [options]
   * @param {string} [options.name] Handler name for logs/DLQ.
   */
  register(eventName, handler, { name } = {}) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler for "${eventName}" must be a function`);
    }
    const list = this.#handlers.get(eventName) ?? [];
    list.push({ name: name ?? handler.name ?? 'anonymous', handler });
    this.#handlers.set(eventName, list);
    logger().debug({ eventName, handler: name ?? handler.name }, 'Event handler registered');
    return this;
  }

  unregister(eventName) {
    this.#handlers.delete(eventName);
  }

  getHandlers(eventName) {
    return this.#handlers.get(eventName) ?? [];
  }

  eventNames() {
    return [...this.#handlers.keys()];
  }

  clear() {
    this.#handlers.clear();
  }
}

export default EventRegistry;
