/**
 * Import / Export extension points for the catalog module. Per the phase scope,
 * ONLY the interfaces are defined here — actual CSV/Excel parsing and bulk
 * upload are implemented in a later phase. Concrete adapters (CsvImporter,
 * ExcelImporter, …) will implement these contracts and be wired via DI, so the
 * ImportExportService and its API surface stay unchanged.
 *
 * @typedef {object} ImportResult
 * @property {number} created
 * @property {number} updated
 * @property {number} skipped
 * @property {Array<{ row: number, error: string }>} errors
 *
 * @typedef {object} ImportOptions
 * @property {'csv'|'xlsx'} format
 * @property {boolean} [upsert]      Update existing rows matched by SKU/slug.
 * @property {boolean} [dryRun]      Validate only; persist nothing.
 */

/** Contract for a bulk catalog IMPORTER (CSV / Excel / bulk product upload). */
export class CatalogImporter {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /**
   * @param {object} scope       Resolved { organizationId, restaurantId } scope.
   * @param {Buffer} buffer      Raw uploaded file.
   * @param {ImportOptions} options
   * @returns {Promise<ImportResult>}
   */
  async importProducts(scope, buffer, options) {
    throw new Error('CatalogImporter.importProducts() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

/** Contract for a catalog EXPORTER (CSV / Excel). */
export class CatalogExporter {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /**
   * @param {object} scope
   * @param {{ format: 'csv'|'xlsx', filter?: object }} options
   * @returns {Promise<{ filename: string, mimeType: string, buffer: Buffer }>}
   */
  async exportProducts(scope, options) {
    throw new Error('CatalogExporter.exportProducts() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}
