import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { logger as baseLogger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';
import { permissionService } from '#modules/identity/index.js';

import { ORDER_NEW_PERMISSIONS } from '../constants/order.constants.js';

/**
 * Seeds the order module's net-new permission rows (`order:manage`,
 * `order:cancel`, `refund:request`, `refund:approve`). `order:*` CRUD already
 * exists in the identity core catalog. Idempotent; registered after pricing.
 */
export class OrderSeeder extends BaseSeeder {
  constructor({ permissions = permissionService, rbac = { permissionRegistry }, logger } = {}) {
    super();
    this.name = '006-order-core';
    this.permissions = permissions;
    this.rbac = rbac;
    this.logger = logger ?? baseLogger({ module: 'order', component: 'seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { permissions: { created: 0, skipped: 0 } };

    for (const perm of ORDER_NEW_PERMISSIONS) {
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

    this.logger.info({ summary }, 'Order seed complete');
    return summary;
  }
}

export const orderSeeder = new OrderSeeder();
export default orderSeeder;
