import { getContext } from '#core/logging/request-context.js';

/**
 * Standard response envelope. Every controller returns through this utility so
 * clients always receive a consistent success/error shape.
 */
export const ApiResponse = {
  /**
   * Build the shared `meta` block from the active request context.
   * @param {Record<string, unknown>} [extra]
   */
  meta(extra = {}) {
    const { requestId } = getContext();
    return { requestId, timestamp: new Date().toISOString(), ...extra };
  },

  /**
   * Send a success envelope.
   * @param {import('express').Response} res
   * @param {object}  options
   * @param {*}       options.data
   * @param {number}  [options.statusCode]
   * @param {Record<string, unknown>} [options.meta]
   */
  success(res, { data = null, statusCode = 200, meta = {} } = {}) {
    return res.status(statusCode).json({
      success: true,
      data,
      meta: ApiResponse.meta(meta),
    });
  },

  /**
   * Send an error envelope. Normally the global error handler calls this.
   * @param {import('express').Response} res
   * @param {object} options
   */
  error(res, { code, message, details = [], statusCode = 500, meta = {} } = {}) {
    return res.status(statusCode).json({
      success: false,
      error: { code, message, details },
      meta: ApiResponse.meta(meta),
    });
  },
};

export default ApiResponse;
