/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildJwtConfig(env) {
  return {
    access: {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
    refresh: {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };
}
