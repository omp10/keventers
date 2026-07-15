import { tokenVerificationService } from '#platform/auth/index.js';

/**
 * Socket.IO authentication middleware. Verifies the access token from the
 * handshake and attaches the principal to `socket.data`. Reuses the exact same
 * token verification as the HTTP layer — one identity model everywhere.
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
      return next(new Error('UNAUTHORIZED'));
    }
  };
}

export default createSocketAuth;
