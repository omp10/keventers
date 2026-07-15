/**
 * Generic exponential-backoff retry used by the event dispatcher (and reusable
 * elsewhere). Pure and transport-agnostic.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {object} [options]
 * @param {number} [options.retries]     Max additional attempts after the first.
 * @param {number} [options.backoffMs]   Base delay.
 * @param {number} [options.factor]      Exponential multiplier.
 * @param {number} [options.maxDelayMs]  Delay ceiling.
 * @param {(err: Error, attempt: number) => void} [options.onRetry]
 * @param {(err: Error) => boolean} [options.shouldRetry]
 * @returns {Promise<T>}
 */
export async function withRetry(operation, options = {}) {
  const {
    retries = 3,
    backoffMs = 200,
    factor = 2,
    maxDelayMs = 10000,
    onRetry,
    shouldRetry = () => true,
  } = options;

  let attempt = 0;
  // Total tries = retries + 1 (the initial attempt).
  for (;;) {
    try {
      return await operation();
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !shouldRetry(err)) throw err;
      const delay = Math.min(backoffMs * factor ** (attempt - 1), maxDelayMs);
      onRetry?.(err, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export default withRetry;
