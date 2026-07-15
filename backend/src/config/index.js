import dotenv from 'dotenv';

import { buildAuthConfig } from './auth.config.js';
import { buildCartConfig } from './cart.config.js';
import { buildCustomerConfig } from './customer.config.js';
import { buildAnalyticsConfig } from './analytics.config.js';
import { buildNotificationConfig } from './notification.config.js';
import { buildDatabaseConfig } from './database.config.js';
import { validateEnv } from './env.schema.js';
import { buildEventsConfig } from './events.config.js';
import { buildJobsConfig } from './jobs.config.js';
import { buildJwtConfig } from './jwt.config.js';
import { buildLoggerConfig } from './logger.config.js';
import { buildObservabilityConfig } from './observability.config.js';
import { buildPaymentConfig } from './payment.config.js';
import { buildQrConfig } from './qr.config.js';
import { buildRedisConfig } from './redis.config.js';
import { buildSecurityConfig } from './security.config.js';
import { buildSeedConfig } from './seed.config.js';
import { buildServerConfig } from './server.config.js';
import { buildSocketConfig } from './socket.config.js';
import { buildStorageConfig } from './storage.config.js';
import { buildSwaggerConfig } from './swagger.config.js';

// Load .env into process.env exactly once, here — the ONLY module allowed to
// touch process.env. Everything else imports the frozen `config` object below.
dotenv.config();

const env = validateEnv(process.env);

/** Recursively freeze an object so config is immutable at runtime. */
function deepFreeze(obj) {
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = obj[key];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}

/**
 * The single, typed, validated, immutable configuration object.
 * Import as: `import { config } from '#config';`
 */
export const config = deepFreeze({
  server: buildServerConfig(env),
  database: buildDatabaseConfig(env),
  redis: buildRedisConfig(env),
  jwt: buildJwtConfig(env),
  auth: buildAuthConfig(env),
  qr: buildQrConfig(env),
  cart: buildCartConfig(env),
  payment: buildPaymentConfig(env),
  customer: buildCustomerConfig(env),
  notification: buildNotificationConfig(env),
  analytics: buildAnalyticsConfig(env),
  security: buildSecurityConfig(env),
  storage: buildStorageConfig(env),
  socket: buildSocketConfig(env),
  jobs: buildJobsConfig(env),
  events: buildEventsConfig(env),
  observability: buildObservabilityConfig(env),
  seed: buildSeedConfig(env),
  logger: buildLoggerConfig(env),
  swagger: buildSwaggerConfig(env),
});

export default config;
