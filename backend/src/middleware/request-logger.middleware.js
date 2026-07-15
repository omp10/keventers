import { pinoHttp } from 'pino-http';

import { baseLogger } from '#core/logging/logger.js';

/**
 * HTTP request/response logging via pino-http. Emits one structured log per
 * request including method, url, status code, and response time — reusing the
 * requestId/correlationId established by the correlation middleware.
 */
export const requestLoggerMiddleware = pinoHttp({
  logger: baseLogger,

  // Reuse the requestId already assigned upstream.
  genReqId: (req) => req.requestId,

  // Attach correlationId to every request-scoped log line.
  customProps: (req) => ({ correlationId: req.correlationId }),

  // Log level derived from the response status / error.
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  customSuccessMessage: (req, res, responseTime) =>
    `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,

  // Trim noisy fields; secrets are already redacted by the base logger config.
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

export default requestLoggerMiddleware;
