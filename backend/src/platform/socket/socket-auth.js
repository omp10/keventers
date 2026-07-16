import { tokenVerificationService } from '#platform/auth/index.js';

/**
 * Optional GUEST verifier, injected by whichever module owns guest identity
 * (qr-ordering registers its guest-token service at bootstrap). The platform
 * stays generic: it knows "a secondary verifier may exist", never whose.
 *
 * @type {((token: string) => { sessionId: string, guestId?: string, branchId?: string, restaurantId?: string, organizationId?: string }) | null}
 */
let guestVerifier = null;

/** Register the guest-token verifier (called once at module bootstrap). */
export function setSocketGuestVerifier(verify) {
  guestVerifier = verify;
}

/**
 * Socket.IO authentication middleware. Verifies the handshake token and
 * attaches the principal to `socket.data`. Accepts EITHER a staff/customer
 * access token (same verification as HTTP) OR — when a guest verifier has been
 * registered — a guest ordering token, so customers can receive live order
 * updates without an account.
 *
 * Token is read from `socket.handshake.auth.token` (preferred) or the
 * Authorization header.
 *
 * @param {object} [options]
 * @param {boolean} [options.required] Reject unauthenticated connections.
 * @returns {(socket: import('socket.io').Socket, next: (err?: Error) => void) => void}
 */
export function createSocketAuth({ required = true } = {}) {
  return function socketAuth(socket, next) {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer /, '');

    if (!token) {
      if (required) return next(new Error('UNAUTHORIZED'));
      socket.data.principal = { id: null, roles: [], permissions: [], authenticated: false };
      return next();
    }

    try {
      const decoded = tokenVerificationService.verifyAccess(token);
      socket.data.principal = {
        id: decoded.sub,
        sessionId: decoded.sid ?? null,
        roles: decoded.roles ?? [],
        permissions: decoded.permissions ?? [],
        authenticated: true,
      };
      return next();
    } catch {
      // Not a staff/customer access token — try the guest verifier, if any.
      if (guestVerifier) {
        try {
          const guest = guestVerifier(token);
          socket.data.principal = {
            id: null,
            roles: [],
            permissions: [],
            authenticated: true,
            guest, // { sessionId, guestId, branchId, restaurantId, organizationId }
          };
          return next();
        } catch {
          /* fall through to rejection */
        }
      }
      return next(new Error('UNAUTHORIZED'));
    }
  };
}

export default createSocketAuth;
