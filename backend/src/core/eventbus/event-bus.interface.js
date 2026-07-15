/**
 * The contract every event-bus implementation must satisfy. Producers and
 * consumers depend ONLY on this shape, so the in-memory bus can be swapped for
 * a Kafka/RabbitMQ-backed bus with no changes to business code.
 *
 * @typedef {object} IEventBus
 * @property {(event: { name: string, payload: unknown }) => Promise<void>} publish
 * @property {(eventName: string, handler: Function, options?: object) => IEventBus} subscribe
 * @property {(eventName: string) => void} unsubscribe
 */

/**
 * Optional base to document/enforce the interface for JS implementations.
 * @implements {IEventBus}
 */
export class AbstractEventBus {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  async publish(_event) {
    throw new Error('publish() not implemented');
  }
  subscribe(_eventName, _handler, _options) {
    throw new Error('subscribe() not implemented');
  }
  unsubscribe(_eventName) {
    throw new Error('unsubscribe() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

export default AbstractEventBus;
