import { logger as baseLogger } from '#core/logging/logger.js';
import { BaseSeeder } from '#database/seeds/base.seeder.js';

import { TABLE_STATUS } from '../constants/qr.constants.js';
import { Table } from '../models/table.model.js';

/** Tables per Keventers branch — the numbers customers type to start ordering. */
const TABLES_PER_BRANCH = 12;

/**
 * Seeds dine-in TABLES for every Keventers branch. Without these there is
 * nothing for a customer's typed table number to resolve to, so ordering can't
 * start — guest sessions are table-scoped by design.
 *
 * Idempotent per (branch, number) and a no-op when no Keventers branches exist.
 */
export class KeventersTablesSeeder extends BaseSeeder {
  constructor({ tables = Table, logger } = {}) {
    super();
    this.name = '017-keventers-tables';
    this.tables = tables;
    this.logger = logger ?? baseLogger({ module: 'qr-ordering', component: 'keventers-tables-seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { branches: 0, tables: { created: 0, skipped: 0 } };

    // The organization module owns branches — import lazily to respect the boundary.
    const { Branch } = await import('#modules/organization/models/branch.model.js');
    const branches = await Branch.find({ slug: { $regex: '^keventers-' } }).lean();
    if (!branches.length) {
      this.logger.warn('No Keventers branches found — skipping table seed');
      return summary;
    }

    for (const branch of branches) {
      summary.branches += 1;
      for (let i = 1; i <= TABLES_PER_BRANCH; i += 1) {
        const number = String(i);
        const exists = await this.tables.findOne({ branchId: branch._id, number });
        if (exists) {
          summary.tables.skipped += 1;
          continue;
        }
        await this.tables.create({
          organizationId: branch.organizationId,
          restaurantId: branch.restaurantId,
          branchId: branch._id,
          number,
          name: `Table ${number}`,
          seatingCapacity: i % 4 === 0 ? 6 : 4,
          status: TABLE_STATUS.AVAILABLE,
          isOrderingEnabled: true,
        });
        summary.tables.created += 1;
      }
    }

    this.logger.info({ summary }, 'Keventers tables seed complete');
    return summary;
  }
}

export const keventersTablesSeeder = new KeventersTablesSeeder();
export default keventersTablesSeeder;
