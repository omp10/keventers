const LEDGER_COLLECTION = '_seeds';

/**
 * Reusable seed runner. Migration-style: records applied seeders in a ledger
 * collection so each runs at most once (idempotent across restarts). Knows
 * nothing about any specific seed data — it just orchestrates whatever is in
 * the registry.
 */
export class SeedRunner {
  /**
   * @param {object} deps
   * @param {import('mongoose').Connection} deps.connection
   * @param {import('ioredis').Redis}       deps.redis
   * @param {import('pino').Logger}         deps.logger
   * @param {import('./base.seeder.js').BaseSeeder[]} deps.seeders
   */
  constructor({ connection, redis, logger, seeders }) {
    this.connection = connection;
    this.redis = redis;
    this.logger = logger;
    this.seeders = seeders;
    this.ledger = connection.collection(LEDGER_COLLECTION);
  }

  get #context() {
    return { connection: this.connection, redis: this.redis, logger: this.logger };
  }

  async #hasRun(name) {
    return Boolean(await this.ledger.findOne({ name }));
  }

  async #markRun(name) {
    await this.ledger.updateOne(
      { name },
      { $set: { name, ranAt: new Date() } },
      { upsert: true },
    );
  }

  async #markRolledBack(name) {
    await this.ledger.deleteOne({ name });
  }

  /** Apply all pending seeders in registry order. */
  async run() {
    this.logger.info({ total: this.seeders.length }, 'Seed run started');
    let applied = 0;

    for (const seeder of this.seeders) {
      if (await this.#hasRun(seeder.name)) {
        this.logger.debug({ seeder: seeder.name }, 'Seed already applied — skipping');
        continue;
      }
      this.logger.info({ seeder: seeder.name }, 'Applying seed');
      await seeder.run(this.#context);
      await this.#markRun(seeder.name);
      applied += 1;
    }

    this.logger.info({ applied }, 'Seed run complete');
    return { applied, total: this.seeders.length };
  }

  /** Roll back all applied seeders in reverse order. */
  async rollback() {
    this.logger.info('Seed rollback started');
    let reverted = 0;

    for (const seeder of [...this.seeders].reverse()) {
      if (!(await this.#hasRun(seeder.name))) continue;
      this.logger.info({ seeder: seeder.name }, 'Rolling back seed');
      await seeder.rollback(this.#context);
      await this.#markRolledBack(seeder.name);
      reverted += 1;
    }

    this.logger.info({ reverted }, 'Seed rollback complete');
    return { reverted };
  }
}

export default SeedRunner;
