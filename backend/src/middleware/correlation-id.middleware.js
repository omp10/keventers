import { randomUUID } from 'node:crypto';

import { runWithContext } from '#core/logging/request-context.js';

const CORRELATION_HEADER = 'x-correlation-id';
const REQUEST_HEADER = 'x-request-id';

/**
 * Establishes per-request identifiers and opens the AsyncLocalStorage context
 * for the remainder of the request lifecycle:
 *  - requestId     : unique per HTTP request (always generated).
 *  - correlationId : spans a logical operation across services; taken from the
 *                    inbound header when present, otherwise generated.
 *
 * Both are echoed back on the response so callers can correlate.
 */
export function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers[CORRELATION_HEADER]?.toString() || randomUUID();
  const requestId = req.headers[REQUEST_HEADER]?.toString() || randomUUID();

  req.requestId = requestId;
  req.correlationId = correlationId;

  res.setHeader(CORRELATION_HEADER, correlationId);
  res.setHeader(REQUEST_HEADER, requestId);

  // Everything downstream (middleware, controllers, services, repositories,
  // event handlers) runs inside this context and can read the ids.
  runWithContext({ requestId, correlationId }, () => next());
}

export default correlationIdMiddleware;
