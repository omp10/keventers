import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { config } from '#config';

import { authenticate } from './authentication.middleware.js';
import { correlationIdMiddleware } from './correlation-id.middleware.js';
import { metricsMiddleware } from './metrics.middleware.js';
import { requestLoggerMiddleware } from './request-logger.middleware.js';

/**
 * Apply the global middleware pipeline (order is load-bearing).
 *
 *   1. security headers (helmet)
 *   2. CORS
 *   3. compression
 *   4. body parsers (json + urlencoded, with size limits)
 *   5. correlation id + AsyncLocalStorage context
 *   6. HTTP request/response logging
 *   7. authentication placeholder (attaches req.principal)
 *
 * Authorization is applied per-route (guard factory), and the 404 + global
 * error handler are mounted AFTER the routers in app.js.
 *
 * @param {import('express').Application} app
 */
export function applyGlobalMiddleware(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.server.corsOrigin,
      credentials: true,
    }),
  );
  app.use(compression());

  // Capture the raw body buffer so provider webhook signatures can be verified
  // against the exact bytes the gateway signed (re-serialized JSON would not
  // match). Additive: normal JSON parsing is unchanged.
  app.use(
    express.json({
      limit: config.server.bodyLimit,
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

  app.use(correlationIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(metricsMiddleware);

  app.use(authenticate);
}

export default applyGlobalMiddleware;
