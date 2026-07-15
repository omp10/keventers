/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildServerConfig(env) {
  return {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
    port: env.PORT,
    host: env.HOST,
    apiPrefix: env.API_PREFIX,
    bodyLimit: env.BODY_LIMIT,
    corsOrigin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
  };
}
