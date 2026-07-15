import pino from 'pino';

import { config } from '#config';

import { getContext } from './request-context.js';

const { level, pretty, redact } = config.logger;

/**
 * Root Pino logger. Structured JSON in every environment; optionally piped
 * through pino-pretty for human-friendly local development.
 */
export const baseLogger = pino({
  level,
  redact: { paths: redact, censor: '[REDACTED]' },
  base: { service: 'keventers-api', env: config.server.env },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(pretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

/**
 * Context-aware logger. Automatically binds requestId/correlationId from the
 * AsyncLocalStorage store, so callers just do `logger().info(...)` anywhere.
 *
 * @param {Record<string, unknown>} [bindings] Extra fields to attach.
 * @returns {import('pino').Logger}
 */
export function logger(bindings = {}) {
  const { requestId, correlationId } = getContext();
  return baseLogger.child({ requestId, correlationId, ...bindings });
}

export default logger;
