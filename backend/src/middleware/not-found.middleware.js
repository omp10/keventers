import { NotFoundError } from '#core/errors/app-error.js';
import { ErrorCode } from '#core/errors/error-codes.js';

/**
 * Terminal fallthrough for unmatched routes. Converts a missing route into a
 * typed NotFoundError so the global error handler renders the standard
 * envelope (rather than Express's default HTML 404).
 */
export function notFoundMiddleware(req, _res, next) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`, ErrorCode.ROUTE_NOT_FOUND));
}

export default notFoundMiddleware;
