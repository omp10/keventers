import { BaseService } from '#core/service/base.service.js';

import { QR_ERRORS, QR_STATUS, QR_TYPE } from '../constants/qr.constants.js';
import { toQrDTO } from '../dto/qr.dto.js';
import {
  QrDisabledEvent,
  QrEnabledEvent,
  QrGeneratedEvent,
  QrRegeneratedEvent,
  QrRotatedEvent,
} from '../events/qr.events.js';
import { qrCodeRepository } from '../repositories/qr-code.repository.js';
import { tableRepository } from '../repositories/table.repository.js';
import { qrValidationCache } from '../stores/qr-validation.cache.js';
import { entityId } from '../utils/id.util.js';
import { generateQrCredential, rotateQrCredential } from '../utils/qr-token.util.js';
import { loadOwned } from '../utils/tenant.util.js';

import { qrImageService } from './qr-image.service.js';

/**
 * QR lifecycle: generate, regenerate, rotate secret, enable/disable, delete.
 * QR generation logic lives here (never in a controller). Each mutation
 * invalidates the QR validation cache so a changed code is never served stale,
 * and (re)renders the QR image through the Storage Platform. Tenant-scoped:
 * a QR is always operated on via a table/QR the caller owns.
 */
export class QrService extends BaseService {
  constructor({
    qrCodes = qrCodeRepository,
    tables = tableRepository,
    images = qrImageService,
    cache = qrValidationCache,
    eventBus,
  } = {}) {
    super({ name: 'qr.qr', eventBus });
    this.qrCodes = qrCodes;
    this.tables = tables;
    this.images = images;
    this.cache = cache;
  }

  #scopeOf(entity) {
    return {
      organizationId: String(entity.organizationId),
      restaurantId: String(entity.restaurantId),
      branchId: String(entity.branchId),
    };
  }

  /** Generate a NEW active QR for a table (deactivates any previous active QR). */
  async generateForTable(tenant, tableId, data = {}, actorId = null) {
    const table = await loadOwned(this.tables, tenant, tableId, QR_ERRORS.TABLE_NOT_FOUND);
    const scope = this.#scopeOf(table);

    // Deactivate + cache-invalidate any existing active QR(s) for the table.
    const existing = await this.qrCodes.findByTable(scope, tableId, { });
    for (const old of existing) {
      if (old.status === QR_STATUS.ACTIVE) await this.cache.del(old.token);
    }
    await this.qrCodes.deactivateForTable(scope, tableId);

    const cred = generateQrCredential(1);
    const qr = await this.qrCodes.createScoped(scope, {
      tableId,
      token: cred.token,
      secretVersion: cred.secretVersion,
      code: cred.code,
      scanUrl: cred.scanUrl,
      type: data.type ?? QR_TYPE.PERMANENT,
      status: QR_STATUS.ACTIVE,
      expiresAt: data.expiresAt ?? null,
      generatedBy: actorId,
      generatedAt: new Date(),
    });

    const image = await this.images.generateAndStore({
      scanUrl: cred.scanUrl,
      filename: `qr-${entityId(qr)}`,
    });
    const updated = await this.qrCodes.updateById(entityId(qr), {
      imageUrl: image.imageUrl,
      imageKey: image.imageKey,
    });
    await this.tables.updateById(tableId, { activeQrCodeId: entityId(qr) });

    await this.events.publish(
      new QrGeneratedEvent({
        branchId: scope.branchId,
        tableId: String(tableId),
        qrCodeId: entityId(qr),
        type: updated.type,
      }),
    );
    this.audit.success('qr.generated', { actorId, targetId: entityId(qr), metadata: { tableId: String(tableId) } });
    return toQrDTO(updated);
  }

  /** Mint a brand-new token for an existing QR (old printed codes stop working). */
  async regenerate(tenant, qrId, actorId = null) {
    const qr = await loadOwned(this.qrCodes, tenant, qrId, QR_ERRORS.QR_NOT_FOUND);
    await this.cache.del(qr.token);
    await this.images.remove(qr.imageKey);

    const cred = generateQrCredential(qr.secretVersion ?? 1);
    const image = await this.images.generateAndStore({ scanUrl: cred.scanUrl, filename: `qr-${qrId}` });
    const updated = await this.qrCodes.updateById(qrId, {
      token: cred.token,
      code: cred.code,
      scanUrl: cred.scanUrl,
      status: QR_STATUS.ACTIVE,
      imageUrl: image.imageUrl,
      imageKey: image.imageKey,
      generatedBy: actorId,
      generatedAt: new Date(),
    });
    await this.events.publish(
      new QrRegeneratedEvent({ branchId: String(qr.branchId), tableId: String(qr.tableId), qrCodeId: qrId }),
    );
    this.audit.success('qr.regenerated', { actorId, targetId: qrId });
    return toQrDTO(updated);
  }

  /** Rotate the signing version: same token, new signature; old codes rejected. */
  async rotateSecret(tenant, qrId, actorId = null) {
    const qr = await loadOwned(this.qrCodes, tenant, qrId, QR_ERRORS.QR_NOT_FOUND);
    await this.cache.del(qr.token);

    const nextVersion = (qr.secretVersion ?? 1) + 1;
    const cred = rotateQrCredential(qr.token, nextVersion);
    const image = await this.images.generateAndStore({ scanUrl: cred.scanUrl, filename: `qr-${qrId}` });
    const updated = await this.qrCodes.updateById(qrId, {
      secretVersion: nextVersion,
      code: cred.code,
      scanUrl: cred.scanUrl,
      imageUrl: image.imageUrl,
      imageKey: image.imageKey,
    });
    await this.events.publish(
      new QrRotatedEvent({ branchId: String(qr.branchId), qrCodeId: qrId, secretVersion: nextVersion }),
    );
    this.audit.success('qr.secret_rotated', { actorId, targetId: qrId });
    return toQrDTO(updated);
  }

  async enable(tenant, qrId, actorId = null) {
    const qr = await loadOwned(this.qrCodes, tenant, qrId, QR_ERRORS.QR_NOT_FOUND);
    await this.cache.del(qr.token);
    const updated = await this.qrCodes.updateById(qrId, { status: QR_STATUS.ACTIVE });
    await this.tables.updateById(String(qr.tableId), { activeQrCodeId: qrId });
    await this.events.publish(new QrEnabledEvent({ branchId: String(qr.branchId), qrCodeId: qrId }));
    this.audit.success('qr.enabled', { actorId, targetId: qrId });
    return toQrDTO(updated);
  }

  async disable(tenant, qrId, actorId = null) {
    const qr = await loadOwned(this.qrCodes, tenant, qrId, QR_ERRORS.QR_NOT_FOUND);
    await this.cache.del(qr.token);
    const updated = await this.qrCodes.updateById(qrId, { status: QR_STATUS.INACTIVE });
    await this.events.publish(new QrDisabledEvent({ branchId: String(qr.branchId), qrCodeId: qrId }));
    this.audit.success('qr.disabled', { actorId, targetId: qrId });
    return toQrDTO(updated);
  }

  async getQr(tenant, qrId) {
    const qr = await loadOwned(this.qrCodes, tenant, qrId, QR_ERRORS.QR_NOT_FOUND);
    return toQrDTO(qr);
  }

  async listByTable(tenant, tableId) {
    const table = await loadOwned(this.tables, tenant, tableId, QR_ERRORS.TABLE_NOT_FOUND);
    const scope = this.#scopeOf(table);
    const rows = await this.qrCodes.findByTable(scope, tableId, { sort: '-createdAt' });
    return rows.map(toQrDTO);
  }

  async deleteQr(tenant, qrId, actorId = null) {
    const qr = await loadOwned(this.qrCodes, tenant, qrId, QR_ERRORS.QR_NOT_FOUND);
    await this.cache.del(qr.token);
    await this.images.remove(qr.imageKey);
    await this.qrCodes.softDeleteById(qrId);
    // Clear the table's active pointer if it referenced this QR.
    await this.tables.updateById(String(qr.tableId), { activeQrCodeId: null });
    this.audit.success('qr.deleted', { actorId, targetId: qrId });
    return { id: qrId, deleted: true };
  }
}

export const qrService = new QrService();
export default qrService;
