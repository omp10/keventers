/**
 * Event serialization boundary. In-process we pass rich objects, but every
 * event must be serializable so the bus can be swapped for Kafka/RabbitMQ
 * without touching producers/consumers. This is the single place that defines
 * the wire format.
 */
export const EventSerializer = {
  /**
   * @param {{ toJSON?: () => object } | object} event
   * @returns {string}
   */
  serialize(event) {
    const plain = typeof event?.toJSON === 'function' ? event.toJSON() : event;
    return JSON.stringify(plain);
  },

  /**
   * @param {string} raw
   * @returns {{ name: string, version: number, payload: unknown, metadata: object }}
   */
  deserialize(raw) {
    return JSON.parse(raw);
  },
};

export default EventSerializer;
