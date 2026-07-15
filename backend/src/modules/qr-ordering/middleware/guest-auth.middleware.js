import { UnauthorizedError } from '#core/errors/app-error.js';
import { BEARER_PREFIX } from '#platform/auth/index.js';

import { QR_ERRORS } from '../constants/qr.constants.js';
import { guestTokenService } from '../services/guest-token.service.js';

/** Extract a Bearer token from the Authorization header, or null. */
function extractBearer(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith(BEARER_PREFIX)) return null;
  return header.slice(BEARER_PREFIX.length).trim();
}

/**
 * OPTIONAL guest resolution: if a valid guest token is present, attach the
 * normalized guest context as `req.guest`; otherwise continue anonymously.
 * Guest tokens are rejected by the platform's access-token verification (wrong
 * `type`), so they can never authenticate staff/admin routes.
 */
export function resolveGuest(req, _res, next) {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    req.guest = guestTokenService.toGuest(guestTokenService.verify(token));
  } catch {
    req.guest = null;
  }
  return next();
}

/** STRICT guest guard: rejects unless a valid guest token is present. */
export function requireGuest(req, _res, next) {
  if (req.guest?.sessionId) return next();
  return next(new UnauthorizedError(QR_ERRORS.INVALID_SESSION_TOKEN));
}

export default resolveGuest;
