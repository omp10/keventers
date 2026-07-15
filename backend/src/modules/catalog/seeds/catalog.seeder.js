import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { logger as baseLogger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';
import { permissionService } from '#modules/identity/index.js';

import { CATALOG_NEW_PERMISSIONS } from '../constants/catalog.constants.js';

/**
 * Seeds the catalog module's net-new permission catalog rows. The core CRUD
 * permissions for menu/category/product/modifier already exist in the identity
 * core catalog; this adds variant/addon CRUD and the catalog read/import/export
 * grants. Idempotent (skips entries that already exist) and registered with the
 * platform seed runner AFTER the organization seeder.
 */
export class CatalogSeeder extends BaseSeeder {
  constructor({ permissions = permissionService, rbac = { permissionRegistry }, logger } = {}) {
    super();
    this.name = '003-catalog-core';
    this.permissions = permissions;
    this.rbac = rbac;
    this.logger = logger ?? baseLogger({ module: 'catalog', component: 'seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { permissions: { created: 0, skipped: 0 } };

    for (const perm of CATALOG_NEW_PERMISSIONS) {
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

    this.logger.info({ summary }, 'Catalog seed complete');
    return summary;
  }
}

export const catalogSeeder = new CatalogSeeder();
export default catalogSeeder;
