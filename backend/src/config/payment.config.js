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
    // Platform-level provider credentials (see env.schema). Used ONLY when a
    // restaurant has no encrypted config of its own — a single set of keys in
    // .env makes the whole platform able to take payments. Shaped exactly like
    // the decrypted credentials the config service hands the provider factory:
    // for Razorpay, `merchantId` is the publishable key id (rzp_test_…),
    // `secretKey` the API secret.
    platformProviders: env.RAZORPAY_KEY_ID
      ? {
          razorpay: {
            provider: 'razorpay',
            merchantId: env.RAZORPAY_KEY_ID,
            secretKey: env.RAZORPAY_KEY_SECRET,
            webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
            environment: env.RAZORPAY_ENV,
            enabledMethods: ['upi', 'credit_card', 'debit_card', 'net_banking', 'wallet'],
          },
        }
      : {},
  };
}
