import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { logger as baseLogger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';
import { permissionService } from '#modules/identity/index.js';

import { ANALYTICS_NEW_PERMISSIONS } from '../constants/analytics.constants.js';

/**
 * Seeds the Analytics Engine's net-new permissions (`analytics:read/export/
 * rebuild`). Idempotent; registered after the notification seeder. No data is
 * seeded — projections are built from live events (and rebuildable on demand).
 */
export class AnalyticsSeeder extends BaseSeeder {
  constructor({ permissions = permissionService, rbac = { permissionRegistry }, logger } = {}) {
    super();
    this.name = '011-analytics-core';
    this.permissions = permissions;
    this.rbac = rbac;
    this.logger = logger ?? baseLogger({ module: 'analytics', component: 'seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { permissions: { created: 0, skipped: 0 } };

    for (const perm of ANALYTICS_NEW_PERMISSIONS) {
      const name = `${perm.resource}:${perm.action}`;
      this.rbac.permissionRegistry.register(name);
      try {
        await this.permissions.createPermission(perm, null);
        summary.permissions.created += 1;
      } catch (err) {
        if (err?.code === ErrorCode.CONFLICT) summary.permissions.skipped += 1;
        else throw err;
      }
    }

    this.logger.info({ summary }, 'Analytics seed complete');
    return summary;
  }
}

export const analyticsSeeder = new AnalyticsSeeder();
export default analyticsSeeder;
