import { randomUUID } from 'node:crypto';

import { config } from '#config';
import { sessionStore } from '#core/cache/session.store.js';
import { UnauthorizedError } from '#core/errors/app-error.js';

import { tokenGenerationService } from './jwt/token-generation.service.js';
import { tokenVerificationService } from './jwt/token-verification.service.js';

/**
 * Session service: binds a refresh token to a revocable server-side session in
 * Redis, and mints access tokens. Enables logout / "revoke all devices" and
 * refresh-token rotation. It receives an identity descriptor (assembled by the
 * future identity module) — it does NOT read a user store itself.
 */
export class SessionService {
  constructor({ store = sessionStore, tokens = tokenGenerationService, verifier = tokenVerificationService } = {}) {
    this.store = store;
    this.tokens = tokens;
    this.verifier = verifier;
    this.ttl = config.auth.session.ttlSeconds;
  }

  /**
   * Create a new session + token pair for an authenticated identity.
   * @param {{ userId: string, roles?: string[], permissions?: string[], meta?: object }} identity
   */
  async createSession({ userId, roles = [], permissions = [], meta = {} }) {
    const sessionId = randomUUID();
    await this.store.save(
      sessionId,
      { userId, roles, permissions, meta, createdAt: new Date().toISOString() },
      this.ttl,
      userId,
    );
    const tokenPair = this.tokens.issueTokenPair({ userId, sessionId, roles, permissions });
    return { sessionId, ...tokenPair };
  }

  /**
   * Rotate a refresh token: validate it, confirm the session still exists, and
   * issue a fresh token pair.
   */
  async refresh(refreshToken) {
    const decoded = this.verifier.verifyRefresh(refreshToken);
    const session = await this.store.get(decoded.sid);
    if (!session) throw new UnauthorizedError('Session expired or revoked');

    await this.store.touch(decoded.sid, this.ttl);
    const tokenPair = this.tokens.issueTokenPair({
      userId: session.userId,
      sessionId: decoded.sid,
      roles: session.roles,
      permissions: session.permissions,
    });
    return { sessionId: decoded.sid, ...tokenPair };
  }

  async getSession(sessionId) {
    return this.store.get(sessionId);
  }

  /** Revoke a single session (logout). */
  async revoke(sessionId, userId) {
    return this.store.destroy(sessionId, userId);
  }

  /** Revoke every session for a user (logout everywhere / password change). */
  async revokeAll(userId) {
    return this.store.destroyAllForUser(userId);
  }
}

export const sessionService = new SessionService();
export default sessionService;
