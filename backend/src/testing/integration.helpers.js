import { createApp } from '../app.js';

/**
 * Integration-test helpers. Builds the real Express app (with all middleware and
 * routes) for black-box HTTP testing, and provides infra connect/disconnect
 * wrappers so integration suites manage MongoDB/Redis lifecycles explicitly.
 *
 * Pair with a test HTTP client (e.g. supertest) in the suite:
 *   const app = buildTestApp();
 *   await request(app).get('/health').expect(200);
 */
export function buildTestApp() {
  return createApp();
}

/**
 * Connect the shared infrastructure for an integration suite. Import lazily so
 * env is seeded (via test-bootstrap) before config/connection modules load.
 */
export async function connectTestInfra() {
  const { mongoConnection } = await import('#core/database/mongoose.connection.js');
  const { redisConnection } = await import('#core/redis/redis.connection.js');
  await mongoConnection.connect();
  await redisConnection.connect();
  return { mongoConnection, redisConnection };
}

export async function disconnectTestInfra() {
  const { mongoConnection } = await import('#core/database/mongoose.connection.js');
  const { redisConnection } = await import('#core/redis/redis.connection.js');
  await Promise.allSettled([mongoConnection.disconnect(), redisConnection.disconnect()]);
}

/** Drop all collections between tests for isolation. */
export async function clearDatabase() {
  const mongoose = (await import('mongoose')).default;
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}
