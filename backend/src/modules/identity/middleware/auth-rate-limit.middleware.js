import { AppError } from '#core/errors/app-error.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { rateLimitStore } from '#core/cache/rate-limit.store.js';
import { config } from '#config';
import { RefreshToken } from '#platform/auth/index.js';

/**
 * Fixed-window rate limit for the sensitive authentication endpoints (login,
 * register, refresh, password reset), keyed by client IP AND — when present — the
 * target email, so an attacker can't brute-force a single account by rotating
 * IPs, nor flood from one IP across accounts. Reuses the platform RateLimitStore
 * (Redis, atomic INCR+EXPIRE). Fail-OPEN on limiter errors (never lock users out
 * of auth because Redis blipped); the limit itself is enforced when Redis is up.
 *
 * @param {string} action  short tag, e.g. 'login' — namespaces the counter.
 * @param {object} [deps]
 * @param {number} [deps.max]           per-action override for the request budget.
 * @param {(req: object) => string|null} [deps.keyOf]
 *   Per-action override for the counter's subject. Return null to fall back to
 *   the default IP(+email) key. Use this when IP is the WRONG subject — see the
 *   refresh route, where every user behind one restaurant's NAT would otherwise
 *   share a single budget.
 */
export function authRateLimit(action, deps = {}) {
  const store = deps.rateLimitStore ?? rateLimitStore;
  const cfg = deps.config ?? config.auth.rateLimit;
  const max = deps.max ?? cfg.max;

  return async function authRateLimitMiddleware(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().slice(0, 120) : null;
      const custom = deps.keyOf?.(req) ?? null;
      const identifier = custom
        ? `auth:${action}:${custom}`
        : email
          ? `auth:${action}:${ip}:${email}`
          : `auth:${action}:${ip}`;
      const result = await store.hit(identifier, cfg.windowSeconds, max);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      if (!result.allowed) {
        return next(
          new AppError({
            message: 'Too many attempts. Please wait and try again.',
            code: ErrorCode.RATE_LIMITED,
            statusCode: 429,
          }),
        );
      }
      return next();
    } catch {
      return next(); // fail-open
    }
  };
}

/**
 * Rate-limit subject for POST /auth/refresh: the SESSION the token belongs to,
 * not the client IP.
 *
 * Refresh is not a credential-guessing endpoint — the refresh token is a signed
 * JWT, so it can't be brute-forced the way a password can, and the thing worth
 * throttling is one token being hammered. Keying by IP instead punished exactly
 * the wrong people: the frontend refreshes once per page load (twice under
 * React StrictMode in dev), so a handful of reloads exhausted the shared budget
 * and every subsequent load failed to restore the session — the app treats a
 * failed refresh as "not signed in", so users were silently logged out. Behind a
 * restaurant's NAT, all staff shared that one budget.
 *
 * The session id is read WITHOUT verifying the signature: this only picks a
 * counter, and an invalid/forged token still fails verification in the service a
 * moment later. Falls back to null (→ IP keying) when the token is unreadable,
 * so garbage input is still throttled per IP.
 */
export function refreshSessionKey(req) {
  const token = req.body?.refreshToken;
  if (typeof token !== 'string') return null;
  try {
    const sid = RefreshToken.decode(token)?.sid;
    return sid ? `sid:${sid}` : null;
  } catch {
    return null;
  }
}

export default authRateLimit;
