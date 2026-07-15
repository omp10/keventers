/**
 * Cart configuration: inactivity-based expiration, idempotency retention and the
 * per-cart mutation lock TTL (optimistic-concurrency belt-and-suspenders).
 *
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildCartConfig(env) {
  return {
    expirationSeconds: env.CART_EXPIRATION_SECONDS,
    idempotencyTtlSeconds: env.CART_IDEMPOTENCY_TTL_SECONDS,
    lockTtlMs: env.CART_LOCK_TTL_MS,
    maxItems: env.CART_MAX_ITEMS,
  };
}
