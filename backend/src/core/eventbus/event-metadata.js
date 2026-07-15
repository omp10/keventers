import { randomUUID } from 'node:crypto';

import { getContext } from '#core/logging/request-context.js';

/**
 * Build the metadata envelope attached to every domain event. Correlation IDs
 * are pulled from the active request context so events emitted during a request
 * remain traceable end-to-end (and across a future broker boundary).
 *
 * @param {object} [overrides]
 * @returns {{
 *   eventId: string,
 *   correlationId: string|undefined,
 *   causationId: string|undefined,
 *   occurredAt: string,
 *   source: string,
 * }}
 */
export function buildEventMetadata(overrides = {}) {
  const { correlationId, requestId } = getContext();
  return {
    eventId: randomUUID(),
    correlationId: overrides.correlationId ?? correlationId,
    causationId: overrides.causationId ?? requestId,
    occurredAt: new Date().toISOString(),
    source: overrides.source ?? 'keventers-api',
    ...overrides,
  };
}
