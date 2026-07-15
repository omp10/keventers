import { AccessToken } from './access-token.js';
import { RefreshToken } from './refresh-token.js';

/**
 * Issues token pairs. Given an identity descriptor (assembled by a future
 * identity module from a real user record) it returns a signed access +
 * refresh token. It performs NO user lookup — callers supply the claims.
 */
export class TokenGenerationService {
  /**
   * @param {object} identity
   * @param {string} identity.userId
   * @param {string} identity.sessionId
   * @param {string[]} [identity.roles]
   * @param {string[]} [identity.permissions]
   * @param {Record<string, unknown>} [identity.claims] Extra access-token claims.
   * @returns {{ accessToken: string, refreshToken: string }}
   */
  issueTokenPair({ userId, sessionId, roles = [], permissions = [], claims = {} }) {
    const accessToken = AccessToken.sign({
      sub: userId,
      sid: sessionId,
      roles,
      permissions,
      ...claims,
    });
    const refreshToken = RefreshToken.sign({ sub: userId, sid: sessionId });
    return { accessToken, refreshToken };
  }

  issueAccessToken(claims) {
    return AccessToken.sign(claims);
  }
}

export const tokenGenerationService = new TokenGenerationService();
export default tokenGenerationService;
