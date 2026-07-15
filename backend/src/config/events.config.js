/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildEventsConfig(env) {
  return {
    maxRetries: env.EVENT_MAX_RETRIES,
    retryBackoffMs: env.EVENT_RETRY_BACKOFF_MS,
  };
}
