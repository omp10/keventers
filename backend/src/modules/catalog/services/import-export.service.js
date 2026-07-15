import { BaseService } from '#core/service/base.service.js';

import { CATALOG_ERRORS } from '../constants/catalog.constants.js';
import { resolveScope } from '../utils/catalog-tenant.util.js';

/**
 * Import / Export orchestration. Per the phase scope this is an EXTENSION POINT
 * ONLY — the tenant-scoped surface, auth and audit are wired now; the concrete
 * CSV/Excel parsing (a CatalogImporter/CatalogExporter injected via DI) is added
 * in a later phase. Until an adapter is bound, the operations reject with a
 * clear "not implemented" error rather than silently succeeding.
 */
export class ImportExportService extends BaseService {
  constructor({ importer = null, exporter = null, resolveScope: scopeResolver, eventBus } = {}) {
    super({ name: 'catalog.import-export', eventBus });
    this.importer = importer;
    this.exporter = exporter;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  /** @returns {Promise<import('../interfaces/import-export.interface.js').ImportResult>} */
  async importProducts(tenant, restaurantId, file, options = {}, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    if (!this.importer) {
      this.audit.failure('catalog.import.attempted', {
        actorId,
        targetId: scope.restaurantId,
        metadata: { reason: 'not_implemented' },
      });
      throw new Error(CATALOG_ERRORS.IMPORT_NOT_IMPLEMENTED);
    }
    const result = await this.importer.importProducts(scope, file?.buffer, options);
    this.audit.success('catalog.import.completed', {
      actorId,
      targetId: scope.restaurantId,
      metadata: result,
    });
    return result;
  }

  /** @returns {Promise<{ filename: string, mimeType: string, buffer: Buffer }>} */
  async exportProducts(tenant, restaurantId, options = {}, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    if (!this.exporter) {
      this.audit.failure('catalog.export.attempted', {
        actorId,
        targetId: scope.restaurantId,
        metadata: { reason: 'not_implemented' },
      });
      throw new Error(CATALOG_ERRORS.EXPORT_NOT_IMPLEMENTED);
    }
    const out = await this.exporter.exportProducts(scope, options);
    this.audit.success('catalog.export.completed', { actorId, targetId: scope.restaurantId });
    return out;
  }
}

export const importExportService = new ImportExportService();
export default importExportService;
