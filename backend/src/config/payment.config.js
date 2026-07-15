/**
 * Payment engine configuration. Provider BASE URLs are fixed per environment
 * (sandbox/live) and live in the provider adapters, not here — this only holds
 * lifecycle/security timings. Merchant credentials are NEVER in config: they are
 * per-restaurant, encrypted at rest via the Security Platform.
 *
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildPaymentConfig(env) {
  return {
    intentTtlSeconds: env.PAYMENT_INTENT_TTL_SECONDS,
    lockTtlMs: env.PAYMENT_LOCK_TTL_MS,
    idempotencyTtlSeconds: env.PAYMENT_IDEMPOTENCY_TTL_SECONDS,
    webhook: {
      dedupTtlSeconds: env.PAYMENT_WEBHOOK_TTL_SECONDS,
      replayWindowSeconds: env.PAYMENT_WEBHOOK_REPLAY_WINDOW_SECONDS,
    },
  };
}
