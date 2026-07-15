import { AppError } from '#core/errors/app-error.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { rateLimitStore } from '#core/cache/rate-limit.store.js';
import { config } from '#config';

/**
 * Fixed-window rate limit for the sensitive authentication endpoints (login,
 * register, refresh, password reset), keyed by client IP AND — when present — the
 * target email, so an attacker can't brute-force a single account by rotating
 * IPs, nor flood from one IP across accounts. Reuses the platform RateLimitStore
 * (Redis, atomic INCR+EXPIRE). Fail-OPEN on limiter errors (never lock users out
 * of auth because Redis blipped); the limit itself is enforced when Redis is up.
 *
 * @param {string} action  short tag, e.g. 'login' — namespaces the counter.
 */
export function authRateLimit(action, deps = {}) {
  const store = deps.rateLimitStore ?? rateLimitStore;
  const cfg = deps.config ?? config.auth.rateLimit;

  return async function authRateLimitMiddleware(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().slice(0, 120) : null;
      const identifier = email ? `auth:${action}:${ip}:${email}` : `auth:${action}:${ip}`;
      const result = await store.hit(identifier, cfg.windowSeconds, cfg.max);
      res.setHeader('X-RateLimit-Limit', cfg.max);
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

export default authRateLimit;
