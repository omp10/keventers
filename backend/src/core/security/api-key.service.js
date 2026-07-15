import { config } from '#config';

import { HashHelper } from './hash.helper.js';
import { SecureToken } from './secure-token.js';

const PREFIX = 'kev';

/**
 * API-key abstraction. Generates keys of the form `kev_<id>_<secret>` and only
 * ever STORES the salted hash of the secret. Consumers persist `{ id, hash }`
 * (in a future module) and verify presented keys via verify(). No storage or
 * CRUD is implemented here — this is the reusable primitive.
 */
export class ApiKeyService {
  constructor(pepper = config.security.apiKeyPepper ?? '') {
    this.pepper = pepper;
  }

  /**
   * @returns {{ id: string, secret: string, plaintextKey: string, hash: string }}
   * `plaintextKey` is shown to the user ONCE; store only `id` + `hash`.
   */
  generate() {
    const id = SecureToken.hex(6);
    const secret = SecureToken.urlSafe(24);
    const plaintextKey = `${PREFIX}_${id}_${secret}`;
    return { id, secret, plaintextKey, hash: this.#hash(secret) };
  }

  /** Parse a presented key into its parts (or null if malformed). */
  parse(plaintextKey) {
    const parts = String(plaintextKey).split('_');
    if (parts.length !== 3 || parts[0] !== PREFIX) return null;
    return { id: parts[1], secret: parts[2] };
  }

  /** Constant-time verification of a presented key against a stored hash. */
  verify(plaintextKey, storedHash) {
    const parsed = this.parse(plaintextKey);
    if (!parsed) return false;
    return HashHelper.safeEqual(this.#hash(parsed.secret), storedHash);
  }

  #hash(secret) {
    return HashHelper.hmacSha256(secret, this.pepper || 'no-pepper');
  }
}

export const apiKeyService = new ApiKeyService();
export default apiKeyService;
