import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { logger as baseLogger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';
import { permissionService } from '#modules/identity/index.js';

import { QR_NEW_PERMISSIONS } from '../constants/qr.constants.js';

/**
 * Seeds the QR Ordering module's net-new permission catalog rows. `table:*` and
 * `qr:*` CRUD already exist in the identity core catalog; this adds
 * `table:manage`, `qr:regenerate` and the `session:*` grants. Idempotent (skips
 * existing) and registered after the catalog seeder.
 */
export class QrSeeder extends BaseSeeder {
  constructor({ permissions = permissionService, rbac = { permissionRegistry }, logger } = {}) {
    super();
    this.name = '004-qr-ordering-core';
    this.permissions = permissions;
    this.rbac = rbac;
    this.logger = logger ?? baseLogger({ module: 'qr-ordering', component: 'seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { permissions: { created: 0, skipped: 0 } };

    for (const perm of QR_NEW_PERMISSIONS) {
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

    this.logger.info({ summary }, 'QR Ordering seed complete');
    return summary;
  }
}

export const qrSeeder = new QrSeeder();
export default qrSeeder;
