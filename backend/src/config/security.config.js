/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildSecurityConfig(env) {
  return {
    encryptionKey: env.ENCRYPTION_KEY,
    apiKeyPepper: env.API_KEY_PEPPER,
  };
}
