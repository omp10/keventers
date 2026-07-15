import { setContext } from '#core/logging/request-context.js';
import { UnauthorizedError } from '#core/errors/app-error.js';

import { ANONYMOUS_PRINCIPAL, BEARER_PREFIX } from '../constants/auth.constants.js';
import { tokenVerificationService } from '../jwt/token-verification.service.js';

/** Extract a Bearer token from the Authorization header, or null. */
function extractBearer(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith(BEARER_PREFIX)) return null;
  return header.slice(BEARER_PREFIX.length).trim();
}

/** Build the request principal from a verified access-token payload. */
function toPrincipal(decoded) {
  return {
    id: decoded.sub,
    sessionId: decoded.sid ?? null,
    roles: decoded.roles ?? [],
    permissions: decoded.permissions ?? [],
    authenticated: true,
  };
}

/**
 * OPTIONAL authentication: verifies a token if present and attaches the
 * principal; otherwise attaches the anonymous principal and continues. Applied
 * globally. Rejection is the job of `requireAuth` / `authorize` guards.
 */
export function authenticate(req, _res, next) {
  const token = extractBearer(req);
  if (!token) {
    req.principal = { ...ANONYMOUS_PRINCIPAL };
    return next();
  }
  try {
    req.principal = toPrincipal(tokenVerificationService.verifyAccess(token));
    setContext('userId', req.principal.id);
    return next();
  } catch (err) {
    // Invalid token on an optional check → treat as anonymous, but surface the
    // typed error so downstream guards can distinguish if needed.
    req.principal = { ...ANONYMOUS_PRINCIPAL };
    req.authError = err;
    return next();
  }
}

/**
 * STRICT authentication guard: rejects the request unless a valid principal is
 * present. Use on protected routes (composed by future modules).
 */
export function requireAuth(req, _res, next) {
  if (req.principal?.authenticated) return next();
  return next(req.authError ?? new UnauthorizedError());
}

export default authenticate;
