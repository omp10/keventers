/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildDatabaseConfig(env) {
  return {
    uri: env.MONGO_URI,
    dbName: env.MONGO_DB_NAME,
    options: {
      dbName: env.MONGO_DB_NAME,
      maxPoolSize: env.MONGO_MAX_POOL_SIZE,
      minPoolSize: env.MONGO_MIN_POOL_SIZE,
      serverSelectionTimeoutMS: env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
      autoIndex: env.NODE_ENV !== 'production',
    },
  };
}
