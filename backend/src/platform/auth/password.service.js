import bcrypt from 'bcrypt';

import { config } from '#config';

/**
 * Password hashing service (bcrypt). The ONLY component that hashes/verifies
 * passwords. No user storage or CRUD — just the reusable primitive.
 */
export class PasswordService {
  constructor(saltRounds = config.auth.bcryptSaltRounds) {
    this.saltRounds = saltRounds;
  }

  /** @param {string} plain @returns {Promise<string>} bcrypt hash */
  async hash(plain) {
    if (!plain || typeof plain !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    return bcrypt.hash(plain, this.saltRounds);
  }

  /** Constant-time verification via bcrypt. */
  async compare(plain, hash) {
    if (!plain || !hash) return false;
    return bcrypt.compare(plain, hash);
  }

  /** True if a stored hash was produced with fewer rounds than current policy. */
  needsRehash(hash) {
    try {
      const rounds = bcrypt.getRounds(hash);
      return rounds < this.saltRounds;
    } catch {
      return true;
    }
  }
}

export const passwordService = new PasswordService();
export default passwordService;
