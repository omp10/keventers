import jwt from 'jsonwebtoken';

import { config } from '#config';

import { TOKEN_TYPE } from '../constants/auth.constants.js';

/**
 * Refresh-token utilities. Long-lived JWT used only to mint new access tokens.
 * Carries a `sid` (session id) so it can be tied to a revocable server session.
 * Signed/verified with the REFRESH secret.
 */
export const RefreshToken = {
  /**
   * @param {{ sub: string, sid: string, [k: string]: unknown }} claims
   */
  sign(claims) {
    return jwt.sign({ ...claims, type: TOKEN_TYPE.REFRESH }, config.jwt.refresh.secret, {
      expiresIn: config.jwt.refresh.expiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
  },

  verify(token) {
    const decoded = jwt.verify(token, config.jwt.refresh.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    if (decoded.type !== TOKEN_TYPE.REFRESH) {
      throw new jwt.JsonWebTokenError('Not a refresh token');
    }
    return decoded;
  },

  decode(token) {
    return jwt.decode(token);
  },
};

export default RefreshToken;
