import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { config } from '#config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Authenticated symmetric encryption (AES-256-GCM) for data at rest that must
 * be reversible (e.g. stored third-party secrets). The key is derived from
 * config.security.encryptionKey; using the service without a configured key
 * throws — encryption is never silently skipped.
 */
export class EncryptionService {
  #key;

  constructor(rawKey = config.security.encryptionKey) {
    // Normalize any provided passphrase to a 32-byte key.
    this.#key = rawKey ? createHash('sha256').update(rawKey).digest() : null;
  }

  #ensureKey() {
    if (!this.#key) {
      throw new Error('ENCRYPTION_KEY is not configured; cannot encrypt/decrypt');
    }
  }

  /**
   * @param {string} plaintext
   * @returns {string} `iv.authTag.ciphertext` (all base64url).
   */
  encrypt(plaintext) {
    this.#ensureKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.#key, iv);
    const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('base64url'), authTag.toString('base64url'), encrypted.toString('base64url')].join(
      '.',
    );
  }

  /**
   * @param {string} payload  Output of encrypt().
   * @returns {string} plaintext
   */
  decrypt(payload) {
    this.#ensureKey();
    const [ivB64, tagB64, dataB64] = String(payload).split('.');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed ciphertext');

    const decipher = createDecipheriv(ALGORITHM, this.#key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  isEnabled() {
    return Boolean(this.#key);
  }
}

export const encryptionService = new EncryptionService();
export default encryptionService;
