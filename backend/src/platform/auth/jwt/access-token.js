import jwt from 'jsonwebtoken';

import { config } from '#config';

import { TOKEN_TYPE } from '../constants/auth.constants.js';

/**
 * Access-token utilities. Short-lived JWT carrying identity + authorization
 * claims (sub, roles, permissions). Signed/verified with the ACCESS secret.
 */
export const AccessToken = {
  /**
   * @param {{ sub: string, roles?: string[], permissions?: string[], [k: string]: unknown }} claims
   */
  sign(claims) {
    return jwt.sign({ ...claims, type: TOKEN_TYPE.ACCESS }, config.jwt.access.secret, {
      expiresIn: config.jwt.access.expiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
  },

  /** @returns {object} decoded payload; throws on invalid/expired. */
  verify(token) {
    const decoded = jwt.verify(token, config.jwt.access.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    if (decoded.type !== TOKEN_TYPE.ACCESS) {
      throw new jwt.JsonWebTokenError('Not an access token');
    }
    return decoded;
  },

  decode(token) {
    return jwt.decode(token);
  },
};

export default AccessToken;
