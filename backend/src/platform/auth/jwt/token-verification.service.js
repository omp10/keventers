import jwt from 'jsonwebtoken';

import { UnauthorizedError } from '#core/errors/app-error.js';
import { ErrorCode } from '#core/errors/error-codes.js';

import { AccessToken } from './access-token.js';
import { RefreshToken } from './refresh-token.js';

/**
 * Verifies tokens and maps JWT errors to the platform's typed auth errors,
 * so middleware/services get consistent 401 responses with stable codes.
 */
export class TokenVerificationService {
  #wrap(fn) {
    try {
      return fn();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired', ErrorCode.TOKEN_EXPIRED);
      }
      throw new UnauthorizedError('Invalid token', ErrorCode.TOKEN_INVALID);
    }
  }

  verifyAccess(token) {
    return this.#wrap(() => AccessToken.verify(token));
  }

  verifyRefresh(token) {
    return this.#wrap(() => RefreshToken.verify(token));
  }
}

export const tokenVerificationService = new TokenVerificationService();
export default tokenVerificationService;
