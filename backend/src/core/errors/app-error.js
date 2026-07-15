import { ErrorCode } from './error-codes.js';

/**
 * Base application error. All *expected* (operational) failures should be an
 * AppError (or a subclass) so the global handler can map them to a stable,
 * client-safe response. Anything that is NOT an AppError is treated as an
 * unexpected programmer error → generic 500 with details hidden in production.
 */
export class AppError extends Error {
  /**
   * @param {object}   params
   * @param {string}   params.message      Human-readable message.
   * @param {string}   [params.code]       Stable machine code (see ErrorCode).
   * @param {number}   [params.statusCode] HTTP status.
   * @param {Array}    [params.details]    Structured field-level details.
   * @param {boolean}  [params.isOperational]
   * @param {Error}    [params.cause]      Underlying error, if any.
   */
  constructor({
    message,
    code = ErrorCode.INTERNAL_ERROR,
    statusCode = 500,
    details = [],
    isOperational = true,
    cause,
  }) {
    super(message, cause ? { cause } : undefined);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details = []) {
    super({ message, code: ErrorCode.BAD_REQUEST, statusCode: 400, details });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = []) {
    super({ message, code: ErrorCode.VALIDATION_ERROR, statusCode: 422, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = ErrorCode.UNAUTHORIZED) {
    super({ message, code, statusCode: 401 });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super({ message, code: ErrorCode.FORBIDDEN, statusCode: 403 });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = ErrorCode.NOT_FOUND) {
    super({ message, code, statusCode: 404 });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = []) {
    super({ message, code: ErrorCode.CONFLICT, statusCode: 409, details });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', details = []) {
    super({ message, code: ErrorCode.SERVICE_UNAVAILABLE, statusCode: 503, details });
  }
}
