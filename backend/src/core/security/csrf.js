import { HashHelper } from './hash.helper.js';
import { SecureToken } from './secure-token.js';

/**
 * Stateless double-submit-cookie CSRF utilities.
 *
 * Primarily relevant for cookie-based browser sessions; pure Bearer-token APIs
 * are generally not CSRF-susceptible. Provided as a reusable primitive so the
 * decision can be made per-surface later. No middleware is wired globally here.
 */
export const Csrf = {
  /** Issue a random CSRF token (set as a cookie AND echoed to the client). */
  issue() {
    return SecureToken.urlSafe(24);
  },

  /**
   * Verify the token from the request header matches the cookie token.
   * @param {string} cookieToken
   * @param {string} headerToken
   */
  verify(cookieToken, headerToken) {
    if (!cookieToken || !headerToken) return false;
    return HashHelper.safeEqual(cookieToken, headerToken);
  },
};

export default Csrf;
