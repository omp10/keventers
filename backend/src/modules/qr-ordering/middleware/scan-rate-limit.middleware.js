import { AppError } from '#core/errors/app-error.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { rateLimitStore } from '#core/cache/rate-limit.store.js';
import { config } from '#config';

/**
 * Fixed-window rate limit for the public QR scan endpoint, keyed by client IP.
 * Guards against scan floods / QR brute-forcing without touching MongoDB. Uses
 * the platform RateLimitStore (Redis). Fail-open: if Redis is unavailable the
 * request proceeds (availability over strictness for the customer entry point).
 */
export function scanRateLimit(deps = {}) {
  const store = deps.rateLimitStore ?? rateLimitStore;
  const { max, windowSeconds } = deps.config ?? config.qr.scanRateLimit;

  return async function scanRateLimitMiddleware(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const result = await store.hit(`ip:${ip}:qr-scan`, windowSeconds, max);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      if (!result.allowed) {
        return next(
          new AppError({
            message: 'Too many scan attempts, please slow down',
            code: ErrorCode.RATE_LIMITED,
            statusCode: 429,
          }),
        );
      }
      return next();
    } catch {
      // Fail-open on limiter errors.
      return next();
    }
  };
}

export default scanRateLimit;
