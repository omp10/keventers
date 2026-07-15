/* eslint-disable no-restricted-syntax -- test bootstrap must seed env before config loads */

/**
 * Global test bootstrap. Referenced by vitest `setupFiles`. Seeds the minimum
 * environment required for the config module to validate, so tests can import
 * application modules without a real .env. Must run BEFORE any `#config` import.
 */
const TEST_ENV_DEFAULTS = {
  NODE_ENV: 'test',
  MONGO_URI: 'mongodb://localhost:27017',
  MONGO_DB_NAME: 'keventers_test',
  JWT_ACCESS_SECRET: 'test-access-secret-at-least-16',
  JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-16',
  ENCRYPTION_KEY: 'test-encryption-key-at-least-32-chars-long',
  LOG_LEVEL: 'silent',
  SWAGGER_ENABLED: 'false',
  METRICS_ENABLED: 'false',
  SOCKET_REDIS_ADAPTER: 'false',
};

export function applyTestEnv(overrides = {}) {
  for (const [key, value] of Object.entries({ ...TEST_ENV_DEFAULTS, ...overrides })) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Auto-apply on import so a bare `setupFiles` entry works.
applyTestEnv();

export default applyTestEnv;
