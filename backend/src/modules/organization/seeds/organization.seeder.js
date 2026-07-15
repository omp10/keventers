import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { logger as baseLogger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';
import { permissionService } from '#modules/identity/index.js';

/** Module-specific permissions not covered by the identity core catalog. */
const MODULE_PERMISSIONS = [
  { resource: 'onboarding', action: 'read', description: 'View onboarding applications' },
  { resource: 'onboarding', action: 'review', description: 'Review onboarding applications' },
  { resource: 'onboarding', action: 'approve', description: 'Approve/reject applications' },
  { resource: 'subscription', action: 'read', description: 'View subscription' },
  { resource: 'subscription', action: 'manage', description: 'Manage subscription lifecycle' },
];

/**
 * Seeds the organization module's additional permission catalog entries.
 * Idempotent (skips entries that already exist) and registered with the
 * platform seed runner after the identity core seeder.
 */
export class OrganizationSeeder extends BaseSeeder {
  constructor({ permissions = permissionService, rbac = { permissionRegistry }, logger } = {}) {
    super();
    this.name = '002-organization-core';
    this.permissions = permissions;
    this.rbac = rbac;
    this.logger = logger ?? baseLogger({ module: 'organization', component: 'seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { permissions: { created: 0, skipped: 0 } };

    for (const perm of MODULE_PERMISSIONS) {
      const name = `${perm.resource}:${perm.action}`;
      this.rbac.permissionRegistry.register(name);
      try {
        await this.permissions.createPermission(perm, null);
        summary.permissions.created += 1;
      } catch (err) {
        if (err?.code === ErrorCode.CONFLICT) {
          summary.permissions.skipped += 1;
        } else {
          throw err;
        }
      }
    }

    this.logger.info({ summary }, 'Organization seed complete');
    return summary;
  }
}

export const organizationSeeder = new OrganizationSeeder();
export default organizationSeeder;
