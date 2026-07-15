/**
 * QR Ordering / Guest-session configuration. QR token signing reuses the JWT
 * access secret when a dedicated QR secret is not provided, so a fresh install
 * is secure by default without extra setup.
 *
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildQrConfig(env) {
  return {
    tokenSecret: env.QR_TOKEN_SECRET || env.JWT_ACCESS_SECRET,
    publicBaseUrl: env.QR_PUBLIC_BASE_URL,
    guestToken: {
      expiresIn: env.GUEST_TOKEN_EXPIRES_IN,
    },
    session: {
      ttlSeconds: env.GUEST_SESSION_TTL_SECONDS,
      idleTimeoutSeconds: env.GUEST_SESSION_IDLE_TIMEOUT_SECONDS,
    },
    scanRateLimit: {
      max: env.QR_SCAN_RATE_LIMIT,
      windowSeconds: env.QR_SCAN_RATE_WINDOW_SECONDS,
    },
  };
}
