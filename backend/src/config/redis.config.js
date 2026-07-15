/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildRedisConfig(env) {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB,
    keyPrefix: env.REDIS_KEY_PREFIX,
    // Connection is opened explicitly from the composition root.
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  };
}
