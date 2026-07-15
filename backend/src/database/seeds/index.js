import { mongoConnection } from '#core/database/mongoose.connection.js';
import { logger } from '#core/logging/logger.js';
import { redisConnection } from '#core/redis/redis.connection.js';

import { seedRegistry } from './seed-registry.js';
import { SeedRunner } from './seed-runner.js';

/**
 * Seed CLI entry point.
 *
 *   npm run seed            → apply pending seeders
 *   npm run seed -- --rollback → roll back applied seeders
 *
 * Standalone from the HTTP server: it opens its own connections, runs, and
 * closes them. No seed data ships in this phase (registry is empty).
 */
async function main() {
  const rollback = process.argv.includes('--rollback');
  const log = logger({ component: 'seed-cli' });

  await mongoConnection.connect();
  await redisConnection.connect();

  const runner = new SeedRunner({
    connection: mongoConnection.getConnection(),
    redis: redisConnection.getClient(),
    logger: log,
    seeders: seedRegistry,
  });

  try {
    if (rollback) {
      await runner.rollback();
    } else {
      await runner.run();
    }
  } finally {
    await mongoConnection.disconnect();
    await redisConnection.disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger({ component: 'seed-cli' }).fatal({ err }, 'Seed run failed');
    process.exit(1);
  });
