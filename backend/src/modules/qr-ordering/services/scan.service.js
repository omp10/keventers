import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import { catalogService } from '#modules/catalog/index.js';
import {
  BRANCH_STATUS,
  RESTAURANT_STATUS,
  branchService,
  restaurantService,
} from '#modules/organization/index.js';

import {
  CACHE_TTL,
  QR_ERRORS,
  QR_STATUS,
  TABLE_STATUS,
} from '../constants/qr.constants.js';
import { toPublicSessionDTO } from '../dto/qr.dto.js';
import { QrScannedEvent } from '../events/qr.events.js';
import { qrCodeRepository } from '../repositories/qr-code.repository.js';
import { tableRepository } from '../repositories/table.repository.js';
import { qrValidationCache } from '../stores/qr-validation.cache.js';
import { isBranchOpen } from '../utils/business-hours.util.js';
import { entityId } from '../utils/id.util.js';
import { parseQrCode, verifyQrSignature } from '../utils/qr-token.util.js';

import { guestTokenService } from './guest-token.service.js';
import { sessionService } from './session.service.js';

/**
 * QR scan orchestration — the gateway entry point. Implements the full scan
 * pipeline: parse → verify signature → resolve QR → validate restaurant → branch
 * → table → business hours → QR active → create guest session → issue guest
 * token → load restaurant context → return. Its responsibility ENDS after a
 * valid session exists; it never creates carts or orders. Security is enforced
 * before any session is created (tamper/replay/expiry/cross-tenant).
 */
export class ScanService extends BaseService {
  constructor({
    qrCodes = qrCodeRepository,
    tables = tableRepository,
    cache = qrValidationCache,
    sessions = sessionService,
    guestToken = guestTokenService,
    restaurants = restaurantService,
    branches = branchService,
    catalog = catalogService,
    eventBus,
  } = {}) {
    super({ name: 'qr.scan', eventBus });
    this.qrCodes = qrCodes;
    this.tables = tables;
    this.cache = cache;
    this.sessions = sessions;
    this.guestToken = guestToken;
    this.restaurants = restaurants;
    this.branches = branches;
    this.catalog = catalog;
  }

  /** Resolve the cached (or freshly loaded) NON-sensitive QR validation record. */
  async #resolveQrRecord(token) {
    const cached = await this.cache.get(token);
    if (cached) return cached;
    const qr = await this.qrCodes.findByToken(token);
    if (!qr) return null;
    const record = {
      qrCodeId: entityId(qr),
      organizationId: String(qr.organizationId),
      restaurantId: String(qr.restaurantId),
      branchId: String(qr.branchId),
      tableId: String(qr.tableId),
      secretVersion: qr.secretVersion ?? 1,
      status: qr.status,
      type: qr.type,
      expiresAt: qr.expiresAt ?? null,
    };
    await this.cache.set(token, record, CACHE_TTL.QR_VALIDATION_SECONDS);
    return record;
  }

  /**
   * Execute the QR scan flow.
   * @param {string} code   The scanned code (`token.version.signature`).
   * @param {object} [meta] { device, guestName, guestCount, customerUserId, now }
   */
  async scan(code, meta = {}) {
    // 1) Parse + 2) verify signature OFFLINE (tamper detection before any I/O).
    const parsed = parseQrCode(code);
    if (!parsed) throw new BadRequestError(QR_ERRORS.INVALID_QR);
    if (!verifyQrSignature(parsed.token, parsed.secretVersion, parsed.signature)) {
      this.audit.failure('qr.scan.rejected', { metadata: { reason: 'signature' } });
      throw new ForbiddenError(QR_ERRORS.QR_TAMPERED);
    }

    // 3) Resolve QR record (Redis cache → Mongo).
    const record = await this.#resolveQrRecord(parsed.token);
    if (!record) throw new NotFoundError(QR_ERRORS.INVALID_QR);

    // 4) QR active + version match (rotated-out codes rejected) + not expired.
    if (record.secretVersion !== parsed.secretVersion) {
      throw new ForbiddenError(QR_ERRORS.QR_TAMPERED);
    }
    if (record.status !== QR_STATUS.ACTIVE) throw new ForbiddenError(QR_ERRORS.QR_INACTIVE);
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new ForbiddenError(QR_ERRORS.QR_EXPIRED);
    }

    const scope = {
      organizationId: record.organizationId,
      restaurantId: record.restaurantId,
      branchId: record.branchId,
    };

    // 5) Validate restaurant + 6) branch (status) — loaded via trusted getters.
    const restaurant = await this.restaurants.getPublicProfile(record.restaurantId);
    if (!restaurant) throw new NotFoundError(QR_ERRORS.RESTAURANT_UNAVAILABLE);
    if (restaurant.status !== RESTAURANT_STATUS.ACTIVE) {
      throw new ForbiddenError(QR_ERRORS.RESTAURANT_UNAVAILABLE);
    }
    const branch = await this.branches.getPublicById(record.branchId);
    if (!branch) throw new NotFoundError(QR_ERRORS.BRANCH_UNAVAILABLE);
    if (branch.status !== BRANCH_STATUS.ACTIVE) {
      throw new ForbiddenError(QR_ERRORS.BRANCH_UNAVAILABLE);
    }

    // 7) Business hours.
    const timezone = branch.settings?.timezone || restaurant.settings?.timezone || 'Asia/Kolkata';
    const hours = isBranchOpen(branch.businessHours, timezone, meta.now ?? new Date());
    if (!hours.open) throw new ForbiddenError(QR_ERRORS.BRANCH_CLOSED);

    // 8) Validate table.
    const table = await this.tables.findById(record.tableId);
    if (!table) throw new NotFoundError(QR_ERRORS.TABLE_UNAVAILABLE);
    if (
      table.isOrderingEnabled === false ||
      table.isReserved === true ||
      table.status === TABLE_STATUS.OUT_OF_SERVICE
    ) {
      throw new ForbiddenError(QR_ERRORS.TABLE_UNAVAILABLE);
    }

    // 9) Create the guest session (occupies the table, emits lifecycle events).
    const { session, recoveryCode } = await this.sessions.createSession({
      scope,
      tableId: record.tableId,
      qrCodeId: record.qrCodeId,
      device: meta.device ?? {},
      guestName: meta.guestName ?? '',
      guestCount: meta.guestCount ?? 1,
      customerUserId: meta.customerUserId ?? null,
    });

    // 10) Issue the guest JWT carrying the full ordering context.
    const token = this.guestToken.issue({
      sessionId: session.sessionId,
      guestId: session.guestId,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId,
      tableId: record.tableId,
      customerUserId: session.customerUserId ? String(session.customerUserId) : null,
    });

    // 11) Scan telemetry (best-effort) + event.
    this.qrCodes.recordScan(record.qrCodeId).catch(() => {});
    await this.events.publish(
      new QrScannedEvent({
        qrCodeId: record.qrCodeId,
        tableId: record.tableId,
        branchId: scope.branchId,
        sessionId: session.sessionId,
      }),
    );

    // 12) Build the full restaurant context (no extra frontend bootstrap needed).
    const context = await this.#buildContext({ scope, restaurant, branch, table });

    return {
      session: toPublicSessionDTO(session),
      guestToken: token,
      recoveryCode,
      context,
    };
  }

  /**
   * OPEN a session WITHOUT a QR code — the "walked in / browsed the menu, now
   * tell us your table" path. A QR scan proves which table you're at; here the
   * customer types the table NUMBER instead, so every other check (restaurant
   * active, branch active, business hours, table orderable) still applies and
   * the resulting session is identical to a scanned one.
   *
   * A table is mandatory: guest sessions are table-scoped (the model requires
   * it), which is what lets the kitchen and staff route an order to a place.
   *
   * @param {{branchSlug: string, tableNumber: string}} input
   */
  async openSession({ branchSlug, tableNumber }, meta = {}) {
    const branch = await this.branches.getPublicBySlug(String(branchSlug ?? '').toLowerCase());
    if (!branch) throw new NotFoundError(QR_ERRORS.BRANCH_UNAVAILABLE);
    if (branch.status !== BRANCH_STATUS.ACTIVE) throw new ForbiddenError(QR_ERRORS.BRANCH_UNAVAILABLE);

    const restaurant = await this.restaurants.getPublicProfile(branch.restaurantId);
    if (!restaurant) throw new NotFoundError(QR_ERRORS.RESTAURANT_UNAVAILABLE);
    if (restaurant.status !== RESTAURANT_STATUS.ACTIVE) {
      throw new ForbiddenError(QR_ERRORS.RESTAURANT_UNAVAILABLE);
    }

    const timezone = branch.settings?.timezone || restaurant.settings?.timezone || 'Asia/Kolkata';
    const hours = isBranchOpen(branch.businessHours, timezone, meta.now ?? new Date());
    if (!hours.open) throw new ForbiddenError(QR_ERRORS.BRANCH_CLOSED);

    const branchId = entityId(branch);
    const table = await this.tables.findOne({
      branchId,
      number: String(tableNumber ?? '').trim(),
      deletedAt: { $in: [null, undefined] },
    });
    if (!table) {
      // "Not available" reads as "someone's sitting there". Distinguish the far
      // more common cause — the outlet has no tables set up at all — so the
      // diner stops re-typing a number that was never going to work.
      const anyTable = await this.tables.findOne({ branchId, deletedAt: { $in: [null, undefined] } });
      throw new NotFoundError(anyTable ? QR_ERRORS.TABLE_NOT_FOUND : QR_ERRORS.NO_TABLES_CONFIGURED);
    }
    if (
      table.isOrderingEnabled === false ||
      table.isReserved === true ||
      table.status === TABLE_STATUS.OUT_OF_SERVICE
    ) {
      throw new ForbiddenError(QR_ERRORS.TABLE_UNAVAILABLE);
    }

    const scope = {
      organizationId: branch.organizationId,
      restaurantId: branch.restaurantId,
      branchId,
    };

    const { session, recoveryCode } = await this.sessions.createSession({
      scope,
      tableId: entityId(table),
      qrCodeId: null, // opened by table number, not by scanning a code
      device: meta.device ?? {},
      guestName: meta.guestName ?? '',
      guestCount: meta.guestCount ?? 1,
      customerUserId: meta.customerUserId ?? null,
    });

    const token = this.guestToken.issue({
      sessionId: session.sessionId,
      guestId: session.guestId,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId,
      tableId: entityId(table),
      customerUserId: session.customerUserId ? String(session.customerUserId) : null,
    });

    const context = await this.#buildContext({ scope, restaurant, branch, table });
    return { session: toPublicSessionDTO(session), guestToken: token, recoveryCode, context };
  }

  /**
   * Recover a session (page refresh / new device) and reissue a fresh guest
   * token carrying the same ordering context, so the client can resume without
   * re-scanning. Session history is preserved.
   */
  async recover({ sessionId, recoveryCode, device = {} }) {
    const { session } = await this.sessions.recoverSession({ sessionId, recoveryCode, device });
    const token = this.guestToken.issue({
      sessionId: session.sessionId,
      guestId: session.guestId,
      organizationId: String(session.organizationId),
      restaurantId: String(session.restaurantId),
      branchId: String(session.branchId),
      tableId: String(session.tableId),
      customerUserId: session.customerUserId ? String(session.customerUserId) : null,
    });
    return { session: toPublicSessionDTO(session), guestToken: token };
  }

  /** Assemble the customer-facing restaurant context returned after a scan. */
  async #buildContext({ scope, restaurant, branch, table }) {
    let activeMenu = null;
    try {
      activeMenu = await this.catalog.getPublicActiveMenu(scope);
    } catch (err) {
      this.logger.warn({ err }, 'Active menu load failed (continuing without menu)');
    }
    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        type: restaurant.type,
      },
      branch: {
        id: branch.id,
        name: branch.name,
        /** The guest app routes to the menu by branch slug (/r/:slug/menu), so a
         *  scan can't land anywhere useful without it. */
        slug: branch.slug ?? null,
        address: branch.address ?? null,
      },
      table: {
        id: table.id ?? String(table._id),
        number: table.number,
        seatingCapacity: table.seatingCapacity,
      },
      currency: restaurant.settings?.currency ?? 'INR',
      tax: restaurant.settings?.tax ?? null,
      timezone: branch.settings?.timezone || restaurant.settings?.timezone || 'Asia/Kolkata',
      businessHours: branch.businessHours ?? [],
      branding: {
        logoUrl: restaurant.settings?.branding?.logoUrl ?? null,
        coverImageUrl: restaurant.settings?.branding?.coverImageUrl ?? null,
        theme: restaurant.settings?.theme ?? null,
      },
      orderPreferences: restaurant.settings?.orderPreferences ?? null,
      activeMenu,
    };
  }
}

export const scanService = new ScanService();
export default scanService;
