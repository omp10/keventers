import { withRetry } from '#core/eventbus/retry-strategy.js';

/**
 * Service-layer retry facade (re-exports the shared exponential-backoff retry).
 * Useful for wrapping flaky external calls (payment gateways, notification
 * providers) in business services.
 */
export const RetryHelper = { withRetry };

export { withRetry };
export default RetryHelper;
