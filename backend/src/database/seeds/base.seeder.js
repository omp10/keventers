/**
 * Contract every seeder must implement. Concrete seeders (added in later
 * phases, one per module) extend this class. No seed DATA lives here — this is
 * purely the reusable shape the runner depends on.
 *
 * @typedef {object} SeedContext
 * @property {import('mongoose').Connection} connection
 * @property {import('ioredis').Redis}       redis
 * @property {import('pino').Logger}         logger
 */
export class BaseSeeder {
  /**
   * Unique, stable name. Used as the idempotency key in the seed ledger.
   * Override in subclasses. Recommended format: `NNN-description`.
   * @type {string}
   */
  name = 'unnamed-seed';

  /**
   * Apply the seed. Must be idempotent-safe when possible.
   * @param {SeedContext} _context
   * @returns {Promise<void>}
   */
  async run(_context) {
    throw new Error(`Seeder "${this.name}" does not implement run()`);
  }

  /**
   * Optional inverse operation, used by `--rollback`.
   * @param {SeedContext} _context
   * @returns {Promise<void>}
   */
  async rollback(_context) {
    // Optional — default no-op.
  }
}

export default BaseSeeder;
