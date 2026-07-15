import { buildEventMetadata } from './event-metadata.js';

/**
 * Base class for all domain events. Subclasses set a stable, past-tense `name`
 * (e.g. "order.placed") and a `version`. Business modules will define their own
 * event subclasses in later phases — none are defined here.
 *
 * @template TPayload
 */
export class DomainEvent {
  /** @type {string} Stable, namespaced, past-tense event name. */
  static eventName = 'domain.event';

  /**
   * @param {TPayload} payload
   * @param {object} [metadataOverrides]
   */
  constructor(payload, metadataOverrides = {}) {
    this.name = new.target.eventName;
    this.version = new.target.version ?? 1;
    this.payload = payload;
    this.metadata = buildEventMetadata({ ...metadataOverrides, name: this.name });
  }

  /** Plain serializable representation (used by the serializer / transport). */
  toJSON() {
    return {
      name: this.name,
      version: this.version,
      payload: this.payload,
      metadata: this.metadata,
    };
  }
}

export default DomainEvent;
