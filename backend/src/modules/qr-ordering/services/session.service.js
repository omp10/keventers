import { randomBytes } from 'node:crypto';

import { v4 as uuidv4 } from 'uuid';

import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, NotFoundError } from '#core/errors/app-error.js';
import { config } from '#config';

import {
  GUEST_IDENTITY,
  LIVE_SESSION_STATUSES,
  QR_ERRORS,
  SESSION_END_REASON,
  SESSION_STATUS,
  SESSION_TRANSITIONS,
} from '../constants/qr.constants.js';
import { toPublicSessionDTO, toSessionDTO } from '../dto/qr.dto.js';
import {
  SessionActivatedEvent,
  SessionCheckoutPendingEvent,
  SessionCompletedEvent,
  SessionCreatedEvent,
  SessionEndedEvent,
  SessionExpiredEvent,
  SessionIdleEvent,
  SessionLinkedAccountEvent,
  SessionRecoveredEvent,
} from '../events/qr.events.js';
import { guestSessionRepository } from '../repositories/guest-session.repository.js';
import { tableRepository } from '../repositories/table.repository.js';
import { guestSessionStore } from '../stores/session.store.js';
import { loadOwned, resolveScope } from '../utils/tenant.util.js';

import { occupancyService } from './occupancy.service.js';

/**
 * Guest ordering-session lifecycle — the heart of the module. The GuestSession
 * is the PRIMARY customer identity for the whole ordering journey; Cart, Order,
 * Kitchen and Payment reference `sessionId`, so a guest may stay anonymous, log
 * in mid-journey, recover after a refresh, or share a table without those
 * modules being redesigned. Redis holds the live session (fast, idle-TTL'd);
 * MongoDB is the durable history. Every transition is guarded by the state
 * machine and publishes a domain event.
 */
export class SessionService extends BaseService {
  constructor({
    sessions = guestSessionRepository,
    tables = tableRepository,
    store = guestSessionStore,
    occupancy = occupancyService,
    sessionConfig = config.qr.session,
    resolveScope: scopeResolver,
    eventBus,
  } = {}) {
    super({ name: 'qr.session', eventBus });
    this.sessions = sessions;
    this.tables = tables;
    this.store = store;
    this.occupancy = occupancy;
    this.sessionConfig = sessionConfig;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  #now() {
    return new Date();
  }

  /** Seconds remaining until the hard cap, clamped to the idle timeout. */
  #liveTtl(expiresAt) {
    const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, Math.min(this.sessionConfig.idleTimeoutSeconds, remaining));
  }

  #snapshot(session) {
    return {
      sessionId: session.sessionId,
      status: session.status,
      organizationId: String(session.organizationId),
      restaurantId: String(session.restaurantId),
      branchId: String(session.branchId),
      tableId: String(session.tableId),
      qrCodeId: session.qrCodeId ? String(session.qrCodeId) : null,
      guestId: session.guestId,
      identityType: session.identityType,
      customerUserId: session.customerUserId ? String(session.customerUserId) : null,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
    };
  }

  /**
   * Create a live guest session (called by the scan flow after all validations).
   * Persists history, writes the Redis live snapshot, occupies the table, and
   * emits SessionCreated + SessionActivated.
   *
   * @param {object} params
   * @param {{organizationId,restaurantId,branchId}} params.scope
   * @param {string} params.tableId
   * @param {string} [params.qrCodeId]
   * @param {object} [params.device]
   * @param {string} [params.guestName]
   * @param {number} [params.guestCount]
   * @param {string|null} [params.customerUserId]
   */
  async createSession(params) {
    const { scope, tableId, qrCodeId = null, device = {}, guestName = '', guestCount = 1, customerUserId = null } = params;
    const now = this.#now();
    const sessionId = uuidv4();
    const guestId = uuidv4();
    const recoveryCode = randomBytes(18).toString('base64url');
    const expiresAt = new Date(now.getTime() + this.sessionConfig.ttlSeconds * 1000);
    const identityType = customerUserId ? GUEST_IDENTITY.REGISTERED : GUEST_IDENTITY.ANONYMOUS;

    const session = await this.sessions.create({
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId,
      tableId,
      qrCodeId,
      sessionId,
      guestId,
      identityType,
      customerUserId,
      guestName,
      guestCount,
      status: SESSION_STATUS.ACTIVE,
      statusHistory: [
        { status: SESSION_STATUS.CREATED, at: now },
        { status: SESSION_STATUS.ACTIVE, at: now },
      ],
      recoveryCode,
      device,
      devices: device?.deviceId || device?.userAgent ? [device] : [],
      lastActivityAt: now,
      expiresAt,
    });

    await this.store.save(sessionId, this.#snapshot(session), this.#liveTtl(expiresAt));
    await this.occupancy.occupy({
      tableId,
      sessionId,
      branchId: scope.branchId,
      ttlSeconds: this.sessionConfig.ttlSeconds,
    });

    await this.events.publishMany([
      new SessionCreatedEvent({
        sessionId,
        branchId: scope.branchId,
        tableId: String(tableId),
        identityType,
      }),
      new SessionActivatedEvent({ sessionId, branchId: scope.branchId, tableId: String(tableId) }),
    ]);
    this.audit.success('qr.session.created', {
      targetId: sessionId,
      metadata: { tableId: String(tableId), identityType },
    });

    return { session, recoveryCode };
  }

  /** Public read of a live/historical session (sliding idle refresh on read). */
  async getPublicSession(sessionId) {
    const cached = await this.store.get(sessionId);
    if (cached) {
      await this.#touch(sessionId, cached);
      return toPublicSessionDTO(cached);
    }
    const session = await this.sessions.findBySessionId(sessionId);
    if (!session) throw new NotFoundError(QR_ERRORS.SESSION_NOT_FOUND);
    return toPublicSessionDTO(session);
  }

  /** Register activity (sliding idle timeout) without a full transition. */
  async #touch(sessionId, snapshot) {
    const ttl = this.#liveTtl(snapshot.expiresAt);
    if (ttl <= 0) return; // expired; a sweep will finalize it
    snapshot.lastActivityAt = this.#now();
    await this.store.save(sessionId, snapshot, ttl);
  }

  async heartbeat(sessionId) {
    const snapshot = await this.store.get(sessionId);
    if (!snapshot) throw new NotFoundError(QR_ERRORS.SESSION_NOT_LIVE);
    await this.#touch(sessionId, snapshot);
    return toPublicSessionDTO(snapshot);
  }

  /**
   * Recover a session after a refresh / new device. Rehydrates Redis, records
   * the device (multi-device), returns to ACTIVE if idle. Requires the session
   * to still be live (non-terminal).
   */
  async recoverSession({ sessionId, recoveryCode, device = {} }) {
    let session = null;
    if (sessionId) session = await this.sessions.findBySessionId(sessionId);
    if (!session && recoveryCode) session = await this.sessions.findByRecoveryCode(recoveryCode);
    if (!session) throw new NotFoundError(QR_ERRORS.SESSION_NOT_FOUND);

    if (!LIVE_SESSION_STATUSES.includes(session.status)) {
      throw new BadRequestError(QR_ERRORS.SESSION_NOT_LIVE);
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await this.#transition(session, SESSION_STATUS.EXPIRED, { reason: SESSION_END_REASON.EXPIRED });
      throw new BadRequestError(QR_ERRORS.SESSION_NOT_LIVE);
    }

    // Record the recovering device.
    const devices = [...(session.devices ?? [])];
    if (device?.deviceId || device?.userAgent) devices.push({ ...device, lastSeenAt: this.#now() });
    const patch = { devices, lastActivityAt: this.#now() };
    if (session.status === SESSION_STATUS.IDLE) patch.status = SESSION_STATUS.ACTIVE;
    const updated = await this.sessions.updateBySessionId(session.sessionId, patch);

    await this.store.save(session.sessionId, this.#snapshot(updated), this.#liveTtl(updated.expiresAt));
    await this.events.publish(
      new SessionRecoveredEvent({
        sessionId: session.sessionId,
        branchId: String(session.branchId),
        tableId: String(session.tableId),
      }),
    );
    this.audit.success('qr.session.recovered', { targetId: session.sessionId });
    return { session: updated };
  }

  /** Associate a live session with a registered account WITHOUT losing history. */
  async linkAccount(sessionId, customerUserId) {
    const session = await this.sessions.findBySessionId(sessionId);
    if (!session) throw new NotFoundError(QR_ERRORS.SESSION_NOT_FOUND);
    const updated = await this.sessions.updateBySessionId(sessionId, {
      customerUserId,
      identityType: GUEST_IDENTITY.REGISTERED,
    });
    const snapshot = await this.store.get(sessionId);
    if (snapshot) {
      snapshot.customerUserId = String(customerUserId);
      snapshot.identityType = GUEST_IDENTITY.REGISTERED;
      await this.#touch(sessionId, snapshot);
    }
    await this.events.publish(
      new SessionLinkedAccountEvent({ sessionId, customerUserId: String(customerUserId) }),
    );
    this.audit.success('qr.session.linked_account', { targetId: sessionId, actorId: String(customerUserId) });
    return toPublicSessionDTO(updated);
  }

  /** Guest-initiated end of the ordering session. */
  async endSession(sessionId, reason = SESSION_END_REASON.GUEST_ENDED) {
    const session = await this.sessions.findBySessionId(sessionId);
    if (!session) throw new NotFoundError(QR_ERRORS.SESSION_NOT_FOUND);
    if (!LIVE_SESSION_STATUSES.includes(session.status)) {
      return toPublicSessionDTO(session); // already terminal — idempotent
    }
    const updated = await this.#transition(session, SESSION_STATUS.COMPLETED, { reason });
    return toPublicSessionDTO(updated);
  }

  /** Move a session to CHECKOUT_PENDING (invoked by the future Cart/Order flow). */
  async markCheckoutPending(sessionId) {
    const session = await this.sessions.findBySessionId(sessionId);
    if (!session) throw new NotFoundError(QR_ERRORS.SESSION_NOT_FOUND);
    return toSessionDTO(await this.#transition(session, SESSION_STATUS.CHECKOUT_PENDING, {}));
  }

  /** Auto-complete a session when its order completes (future Order module hook). */
  async completeForOrder(sessionId) {
    const session = await this.sessions.findBySessionId(sessionId);
    if (!session || !LIVE_SESSION_STATUSES.includes(session.status)) return null;
    return this.#transition(session, SESSION_STATUS.COMPLETED, {
      reason: SESSION_END_REASON.ORDER_COMPLETED,
    });
  }

  // --- staff / admin ---

  async listSessions(tenant, restaurantId, branchId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.tableId) filter.tableId = query.tableId;
    const page = await this.sessions.paginateScoped(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'tableId', 'identityType'],
    });
    return this.paginated(page, toSessionDTO);
  }

  async getSessionForStaff(tenant, id) {
    const session = await loadOwned(this.sessions, tenant, id, QR_ERRORS.SESSION_NOT_FOUND);
    return toSessionDTO(session);
  }

  /** Staff/admin terminate a live session (also frees the table). */
  async terminateSession(tenant, id, actorId = null) {
    const session = await loadOwned(this.sessions, tenant, id, QR_ERRORS.SESSION_NOT_FOUND);
    if (!LIVE_SESSION_STATUSES.includes(session.status)) return toSessionDTO(session);
    const updated = await this.#transition(session, SESSION_STATUS.TERMINATED, {
      reason: SESSION_END_REASON.ADMIN_TERMINATED,
    });
    this.audit.success('qr.session.terminated', { actorId, targetId: session.sessionId });
    return toSessionDTO(updated);
  }

  /** Admin force-release a table: terminate every live session then free it.
   * Table ownership is asserted (loadOwned) so no cross-tenant release is possible. */
  async releaseTable(tenant, tableId, actorId = null) {
    const table = await loadOwned(this.tables, tenant, tableId, QR_ERRORS.TABLE_NOT_FOUND);
    const live = await this.sessions.findLiveByTable(tableId, LIVE_SESSION_STATUSES);
    for (const s of live) {
      await this.#transition(s, SESSION_STATUS.TERMINATED, { reason: SESSION_END_REASON.TABLE_RELEASED });
    }
    await this.occupancy.forceRelease({
      tableId,
      branchId: String(table.branchId),
      reason: SESSION_END_REASON.TABLE_RELEASED,
    });
    this.audit.success('qr.table.force_released', { actorId, targetId: String(tableId) });
    return { tableId: String(tableId), releasedSessions: live.length };
  }

  /**
   * Sweep sessions past their hard expiry that are still live and finalize them
   * (EXPIRED + table release). Intended to be run by a scheduled job — the
   * mechanism behind "auto release after session timeout".
   */
  async expireStaleSessions(limit = 100) {
    const stale = await this.sessions.find(
      { status: { $in: LIVE_SESSION_STATUSES }, expiresAt: { $lte: this.#now() } },
      { limit },
    );
    for (const s of stale) {
      await this.#transition(s, SESSION_STATUS.EXPIRED, { reason: SESSION_END_REASON.IDLE_TIMEOUT });
    }
    return { expired: stale.length };
  }

  // --- state machine core ---

  #canTransition(from, to) {
    return (SESSION_TRANSITIONS[from] ?? []).includes(to);
  }

  /**
   * Apply a guarded state transition: persist status + history, update/remove the
   * Redis snapshot, release the table on terminal states, and publish the mapped
   * domain event(s).
   */
  async #transition(session, toStatus, { reason = null }) {
    if (session.status === toStatus) return session;
    if (!this.#canTransition(session.status, toStatus)) {
      throw new BadRequestError(QR_ERRORS.INVALID_TRANSITION);
    }
    const now = this.#now();
    const terminal = SESSION_TRANSITIONS[toStatus].length === 0;
    const patch = {
      status: toStatus,
      lastActivityAt: now,
      statusHistory: [...(session.statusHistory ?? []), { status: toStatus, at: now }],
    };
    if (terminal) {
      patch.endedAt = now;
      patch.endedReason = reason;
    }
    const updated = await this.sessions.updateBySessionId(session.sessionId, patch);

    if (terminal) {
      await this.store.destroy(session.sessionId);
      await this.occupancy.release({
        tableId: String(session.tableId),
        sessionId: session.sessionId,
        branchId: String(session.branchId),
        reason: reason ?? SESSION_END_REASON.GUEST_ENDED,
      });
    } else {
      const snapshot = await this.store.get(session.sessionId);
      if (snapshot) {
        snapshot.status = toStatus;
        await this.#touch(session.sessionId, snapshot);
      }
    }

    await this.#publishForStatus(updated, reason);
    return updated;
  }

  async #publishForStatus(session, reason) {
    const base = {
      sessionId: session.sessionId,
      branchId: String(session.branchId),
      tableId: String(session.tableId),
    };
    switch (session.status) {
      case SESSION_STATUS.ACTIVE:
        return this.events.publish(new SessionActivatedEvent(base));
      case SESSION_STATUS.IDLE:
        return this.events.publish(new SessionIdleEvent(base));
      case SESSION_STATUS.CHECKOUT_PENDING:
        return this.events.publish(new SessionCheckoutPendingEvent(base));
      case SESSION_STATUS.COMPLETED:
        return this.events.publishMany([
          new SessionCompletedEvent(base),
          new SessionEndedEvent({ ...base, reason }),
        ]);
      case SESSION_STATUS.EXPIRED:
        return this.events.publishMany([
          new SessionExpiredEvent(base),
          new SessionEndedEvent({ ...base, reason }),
        ]);
      case SESSION_STATUS.TERMINATED:
        return this.events.publish(new SessionEndedEvent({ ...base, reason }));
      default:
        return undefined;
    }
  }
}

export const sessionService = new SessionService();
export default sessionService;
