/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildSocketConfig(env) {
  return {
    path: env.SOCKET_PATH,
    corsOrigin:
      env.SOCKET_CORS_ORIGIN === '*'
        ? '*'
        : env.SOCKET_CORS_ORIGIN.split(',').map((o) => o.trim()),
    useRedisAdapter: env.SOCKET_REDIS_ADAPTER,
  };
}
