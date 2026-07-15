import { randomUUID } from 'node:crypto';

import { getContext, setContext } from '#core/logging/request-context.js';
import { logger } from '#core/logging/logger.js';

import { startTimer } from './timer.js';

/**
 * Lightweight, dependency-free request tracing built on the existing
 * AsyncLocalStorage context. Produces trace/span ids and duration logs. The
 * shape is OpenTelemetry-compatible, so it can be upgraded to real OTel spans
 * later without changing call sites.
 */
export const Tracing = {
  /** Ensure a traceId exists on the active context and return it. */
  ensureTrace() {
    const ctx = getContext();
    if (!ctx.traceId) {
      const traceId = ctx.correlationId ?? randomUUID();
      setContext('traceId', traceId);
      return traceId;
    }
    return ctx.traceId;
  },

  /**
   * Run `fn` inside a named span, logging its duration and outcome.
   * @template T
   * @param {string} name
   * @param {() => Promise<T>} fn
   * @param {Record<string, unknown>} [attributes]
   * @returns {Promise<T>}
   */
  async span(name, fn, attributes = {}) {
    const traceId = Tracing.ensureTrace();
    const spanId = randomUUID().slice(0, 16);
    const end = startTimer();
    const log = logger({ traceId, spanId, span: name, ...attributes });
    try {
      const result = await fn();
      log.debug({ durationMs: Math.round(end()) }, 'span.end');
      return result;
    } catch (err) {
      log.warn({ durationMs: Math.round(end()), err }, 'span.error');
      throw err;
    }
  },
};

export default Tracing;
