import { randomBytes, randomInt, randomUUID } from 'node:crypto';

/**
 * Cryptographically-secure random token generators for verification links,
 * password-reset tokens, one-time passcodes, etc.
 */
export const SecureToken = {
  uuid() {
    return randomUUID();
  },

  /** URL-safe base64 token of `bytes` entropy. */
  urlSafe(bytes = 32) {
    return randomBytes(bytes).toString('base64url');
  },

  hex(bytes = 32) {
    return randomBytes(bytes).toString('hex');
  },

  /** Numeric one-time passcode of `length` digits (uniformly distributed). */
  numericOtp(length = 6) {
    const max = 10 ** length;
    return randomInt(0, max).toString().padStart(length, '0');
  },
};

export default SecureToken;
