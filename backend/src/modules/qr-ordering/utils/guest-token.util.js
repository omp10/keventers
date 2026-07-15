import jwt from 'jsonwebtoken';

import { config } from '#config';

import { GUEST_TOKEN_TYPE } from '../constants/qr.constants.js';

/**
 * Guest JWT utilities. Reuses the platform's JWT infrastructure (same access
 * secret + issuer/audience) but stamps a distinct `type: 'guest'` claim, so a
 * guest token is REJECTED by the normal access-token verification (which
 * requires type=access) and can never authenticate a staff/admin route. It only
 * validates through this module's guest-auth middleware.
 *
 * Claims carry the full ordering context (session + tenant + table + guest) so
 * the frontend and future Cart/Order modules need no extra bootstrap lookup.
 */
export const GuestToken = {
  /**
   * @param {object} claims
   * @param {string} claims.sessionId
   * @param {string} claims.guestId
   * @param {string} claims.organizationId
   * @param {string} claims.restaurantId
   * @param {string} claims.branchId
   * @param {string} claims.tableId
   * @param {string|null} [claims.customerUserId]
   */
  sign(claims, deps = {}) {
    const cfg = deps.config ?? config;
    const payload = {
      sub: claims.guestId,
      typ: GUEST_TOKEN_TYPE,
      sid: claims.sessionId,
      org: claims.organizationId,
      rst: claims.restaurantId,
      brn: claims.branchId,
      tbl: claims.tableId,
      cst: claims.customerUserId ?? null,
    };
    return jwt.sign(payload, cfg.jwt.access.secret, {
      expiresIn: cfg.qr.guestToken.expiresIn,
      issuer: cfg.jwt.issuer,
      audience: cfg.jwt.audience,
    });
  },

  /** Verify a guest token; throws on invalid/expired or wrong type. */
  verify(token, deps = {}) {
    const cfg = deps.config ?? config;
    const decoded = jwt.verify(token, cfg.jwt.access.secret, {
      issuer: cfg.jwt.issuer,
      audience: cfg.jwt.audience,
    });
    if (decoded.typ !== GUEST_TOKEN_TYPE) {
      throw new jwt.JsonWebTokenError('Not a guest token');
    }
    return decoded;
  },

  /** Map a decoded guest token to a normalized guest principal. */
  toGuest(decoded) {
    return {
      guestId: decoded.sub,
      sessionId: decoded.sid,
      organizationId: decoded.org,
      restaurantId: decoded.rst,
      branchId: decoded.brn,
      tableId: decoded.tbl,
      customerUserId: decoded.cst ?? null,
    };
  },
};

export default GuestToken;
