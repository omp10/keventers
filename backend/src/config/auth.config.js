/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildAuthConfig(env) {
  return {
    bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
    session: {
      ttlSeconds: env.SESSION_TTL_SECONDS,
      maxPerUser: env.AUTH_MAX_SESSIONS_PER_USER,
    },
    // Brute-force / credential-stuffing protection for the auth endpoints
    // (login, register, refresh, password reset), keyed by IP (+ email).
    rateLimit: {
      max: env.AUTH_RATE_LIMIT_MAX,
      windowSeconds: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    },
  };
}
