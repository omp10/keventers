import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { logger as baseLogger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';
import { permissionService } from '#modules/identity/index.js';

import { CUSTOMER_NEW_PERMISSIONS } from '../constants/customer.constants.js';

/**
 * Seeds the Customer Platform's net-new permissions (`customer:read/manage`,
 * `loyalty:read/adjust`, `reward:read/manage/grant`). Idempotent; registered
 * after the payment seeder.
 */
export class CustomerSeeder extends BaseSeeder {
  constructor({ permissions = permissionService, rbac = { permissionRegistry }, logger } = {}) {
    super();
    this.name = '009-customer-core';
    this.permissions = permissions;
    this.rbac = rbac;
    this.logger = logger ?? baseLogger({ module: 'customer', component: 'seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { permissions: { created: 0, skipped: 0 } };

    for (const perm of CUSTOMER_NEW_PERMISSIONS) {
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

    this.logger.info({ summary }, 'Customer seed complete');
    return summary;
  }
}

export const customerSeeder = new CustomerSeeder();
export default customerSeeder;
