/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildSeedConfig(env) {
  return {
    admin: {
      name: env.PLATFORM_ADMIN_NAME,
      email: env.PLATFORM_ADMIN_EMAIL,
      password: env.PLATFORM_ADMIN_PASSWORD,
      phone: env.PLATFORM_ADMIN_PHONE ?? null,
    },
    organization: {
      enabled: env.SEED_DEFAULT_ORG_ENABLED,
      name: env.SEED_DEFAULT_ORG_NAME,
    },
  };
}
