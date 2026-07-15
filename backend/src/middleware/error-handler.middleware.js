import { config } from '#config';
import { AppError } from '#core/errors/app-error.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { ApiResponse } from '#core/http/api-response.js';
import { logger } from '#core/logging/logger.js';

/**
 * Normalize framework/library errors (Zod, Mongoose, body-parser, JSON parse)
 * into an AppError. Anything unrecognized is treated as an unexpected 500.
 */
function normalizeError(err) {
  if (err instanceof AppError) return err;

  // express.json() / body-parser payload-too-large & malformed JSON.
  if (err.type === 'entity.too.large') {
    return new AppError({
      message: 'Request payload too large',
      code: ErrorCode.PAYLOAD_TOO_LARGE,
      statusCode: 413,
    });
  }
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return new AppError({
      message: 'Malformed JSON in request body',
      code: ErrorCode.BAD_REQUEST,
      statusCode: 400,
    });
  }

  // Zod validation errors (defensive — business validation middleware comes later).
  if (err.name === 'ZodError' && Array.isArray(err.issues)) {
    return new AppError({
      message: 'Validation failed',
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 422,
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  // Mongoose cast/validation errors.
  if (err.name === 'CastError') {
    return new AppError({
      message: `Invalid value for '${err.path}'`,
      code: ErrorCode.BAD_REQUEST,
      statusCode: 400,
    });
  }

  // Unknown / programmer error → opaque 500.
  return new AppError({
    message: err.message || 'Internal server error',
    code: ErrorCode.INTERNAL_ERROR,
    statusCode: 500,
    isOperational: false,
    cause: err,
  });
}

/**
 * Global, terminal error handler. MUST be registered last. The single place
 * that turns any error into the standard response envelope.
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars -- Express requires the 4-arg signature.
export function errorHandlerMiddleware(err, req, res, next) {
  const appError = normalizeError(err);

  const logPayload = {
    err: appError,
    code: appError.code,
    statusCode: appError.statusCode,
    path: req.originalUrl,
    method: req.method,
  };

  if (!appError.isOperational || appError.statusCode >= 500) {
    logger().error(logPayload, 'Unhandled error');
  } else {
    logger().warn(logPayload, 'Handled error');
  }

  // Hide internal details of non-operational errors in production.
  const exposeMessage = appError.isOperational || !config.server.isProduction;

  return ApiResponse.error(res, {
    code: appError.code,
    message: exposeMessage ? appError.message : 'Internal server error',
    details: appError.details ?? [],
    statusCode: appError.statusCode,
  });
}

export default errorHandlerMiddleware;
