import { QrCode } from '../models/qr-code.model.js';

import { BranchScopedRepository } from './branch-scoped.repository.js';

export class QrCodeRepository extends BranchScopedRepository {
  constructor(model = QrCode) {
    super(model, { softDelete: true, searchableFields: ['code'] });
  }

  /**
   * Global lookup by public token (the scan path). Tokens are unguessable and
   * globally unique, so this is intentionally NOT tenant-scoped — the scan flow
   * verifies the offline signature and then the entity's own tenant fields.
   */
  async findByToken(token, { includeDeleted = false } = {}) {
    const filter = { token };
    if (!includeDeleted) filter.deletedAt = { $in: [null, undefined] };
    return this.toDomain(await this.model.findOne(filter));
  }

  /** The table's current active QR (at most one). */
  findActiveByTable(scope, tableId) {
    return this.findOneScoped(scope, { tableId, status: 'active' });
  }

  findByTable(scope, tableId, options = {}) {
    return this.findScoped(scope, { tableId }, options);
  }

  /** Deactivate every existing QR for a table (before assigning a new active one). */
  deactivateForTable(scope, tableId, options = {}) {
    return this.model.updateMany(
      this.scoped(scope, { tableId, status: 'active', deletedAt: { $in: [null, undefined] } }),
      { $set: { status: 'inactive' } },
      options.session ? { session: options.session } : {},
    );
  }

  /** Increment scan telemetry without loading the doc. */
  recordScan(qrId, options = {}) {
    return this.model.updateOne(
      { _id: qrId },
      { $inc: { scanCount: 1 }, $set: { lastScannedAt: new Date() } },
      options.session ? { session: options.session } : {},
    );
  }
}

export const qrCodeRepository = new QrCodeRepository();
export default qrCodeRepository;
