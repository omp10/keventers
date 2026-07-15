import { BaseService } from '#core/service/base.service.js';
import { distributedLock } from '#core/cache/distributed-lock.js';

import { RELEASE_TRIGGER, TABLE_STATUS } from '../constants/qr.constants.js';
import { TableOccupiedEvent, TableReleasedEvent } from '../events/qr.events.js';
import { tableRepository } from '../repositories/table.repository.js';
import { occupancyStore } from '../stores/occupancy.store.js';

/**
 * Table occupancy coordination. Redis is the source of truth for who currently
 * holds a table (O(1), survives bursty scans); the Table document is a
 * best-effort mirror updated only on 0↔1 transitions. A short distributed lock
 * per table serializes the mirror update so concurrent scans/releases don't
 * flip the persisted status. Supports occupy, release, force-release and the
 * documented auto-release triggers (order completion / timeout / admin action).
 */
export class OccupancyService extends BaseService {
  constructor({ tables = tableRepository, store = occupancyStore, lock = distributedLock, eventBus } = {}) {
    super({ name: 'qr.occupancy', eventBus });
    this.tables = tables;
    this.store = store;
    this.lock = lock;
  }

  #lockKey(tableId) {
    return `table-occupancy:${tableId}`;
  }

  /** Attach a session to a table; marks it OCCUPIED on the first live session. */
  async occupy({ tableId, sessionId, branchId, ttlSeconds }) {
    return this.lock.withLock(this.#lockKey(tableId), async () => {
      const count = await this.store.addSession(tableId, sessionId, ttlSeconds);
      await this.store.setStatus(tableId, { status: TABLE_STATUS.OCCUPIED, sessions: count }, ttlSeconds);
      if (count === 1) {
        await this.tables.updateById(tableId, {
          status: TABLE_STATUS.OCCUPIED,
          currentSessionId: sessionId,
          occupiedAt: new Date(),
        });
        await this.events.publish(
          new TableOccupiedEvent({ tableId: String(tableId), branchId: String(branchId ?? ''), sessionId }),
        );
      }
      return { occupied: true, sessions: count };
    });
  }

  /** Detach a session; releases the table when the last live session leaves. */
  async release({ tableId, sessionId, branchId, reason = RELEASE_TRIGGER.SESSION_ENDED }) {
    return this.lock.withLock(this.#lockKey(tableId), async () => {
      const remaining = await this.store.removeSession(tableId, sessionId);
      if (remaining <= 0) {
        await this.store.clear(tableId);
        await this.#markAvailable(tableId, branchId, reason);
        return { released: true, sessions: 0 };
      }
      await this.store.setStatus(tableId, { status: TABLE_STATUS.OCCUPIED, sessions: remaining });
      return { released: false, sessions: remaining };
    });
  }

  /** Force a table fully available regardless of live sessions (admin action). */
  async forceRelease({ tableId, branchId, reason = RELEASE_TRIGGER.FORCE }) {
    return this.lock.withLock(this.#lockKey(tableId), async () => {
      await this.store.clear(tableId);
      await this.#markAvailable(tableId, branchId, reason);
      return { released: true, sessions: 0 };
    });
  }

  async #markAvailable(tableId, branchId, reason) {
    await this.tables.updateById(tableId, {
      status: TABLE_STATUS.AVAILABLE,
      currentSessionId: null,
      occupiedAt: null,
    });
    await this.events.publish(
      new TableReleasedEvent({ tableId: String(tableId), branchId: String(branchId ?? ''), reason }),
    );
  }

  async getLiveCount(tableId) {
    return this.store.countSessions(tableId);
  }
}

export const occupancyService = new OccupancyService();
export default occupancyService;
