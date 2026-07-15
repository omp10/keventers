import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Non-reversible hashing helpers (integrity/lookups/API-key digests).
 * NOTE: password hashing uses bcrypt (see auth PasswordService) — do NOT use
 * these for passwords.
 */
export const HashHelper = {
  sha256(input, encoding = 'hex') {
    return createHash('sha256').update(input).digest(encoding);
  },

  sha512(input, encoding = 'hex') {
    return createHash('sha512').update(input).digest(encoding);
  },

  hmacSha256(input, secret, encoding = 'hex') {
    return createHmac('sha256', secret).update(input).digest(encoding);
  },

  /** Constant-time string comparison to avoid timing attacks. */
  safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  },
};

export default HashHelper;
