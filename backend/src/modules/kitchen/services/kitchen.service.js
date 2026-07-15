import { BaseService } from '#core/service/base.service.js';
import { ConflictError, NotFoundError } from '#core/errors/app-error.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { orderService } from '#modules/order/index.js';

import {
  ACTIVE_KITCHEN_STATUSES,
  ACTOR_TYPE,
  KITCHEN_ERRORS,
  KITCHEN_STATUS,
  PRIORITY,
  PRIORITY_WEIGHT,
  REDIS_KEYS,
  SOCKET_EVENTS,
  STATUS_SOCKET_EVENT,
} from '../constants/kitchen.constants.js';
import { toKitchenBoardRowDTO, toKitchenEntryDTO } from '../dto/kitchen.dto.js';
import {
  KitchenOrderQueuedEvent,
  KitchenSlaBreachedEvent,
  STATUS_EVENT,
} from '../events/kitchen.events.js';
import { kitchenQueueRepository } from '../repositories/kitchen-queue.repository.js';
import { kitchenStationRepository } from '../repositories/kitchen-station.repository.js';
import { kitchenQueueStore } from '../stores/kitchen-queue.store.js';
import { entityId } from '../utils/id.util.js';
import { assertKitchenAccess, resolveBranchScope } from '../utils/tenant.util.js';
import { assertTransition, timelineEntry } from '../utils/kitchen-state-machine.js';

import { chefAssignmentService } from './chef-assignment.service.js';
import { slaService } from './sla.service.js';
import { stationRouterService } from './station-router.service.js';
import { kitchenRealtimeService } from './kitchen-realtime.service.js';

/**
 * Kitchen Display System core. Driven by ORDER EVENTS (enqueue on confirm,
 * cancel on order-cancel) — it never writes back to the order, keeping the
 * boundary clean. Owns the kitchen workflow state machine, chef assignment,
 * timers, SLA and the live board. Transitions are serialized per entry (Redis
 * lock) + optimistically versioned; every change fans out via domain events +
 * Socket.IO + audit.
 */
export class KitchenService extends BaseService {
  constructor({
    queue = kitchenQueueRepository,
    stations = kitchenStationRepository,
    router = stationRouterService,
    sla = slaService,
    chefs = chefAssignmentService,
    realtime = kitchenRealtimeService,
    store = kitchenQueueStore,
    orders = orderService,
    resolveScope = resolveBranchScope,
    lock = distributedLock,
    eventBus,
  } = {}) {
    super({ name: 'kitchen', eventBus });
    this.queue = queue;
    this.stations = stations;
    this.router = router;
    this.sla = sla;
    this.chefs = chefs;
    this.realtime = realtime;
    this.store = store;
    this.orders = orders;
    this.resolveScope = resolveScope;
    this.lock = lock;
  }

  #scopeOf(entry) {
    return {
      organizationId: String(entry.organizationId),
      restaurantId: String(entry.restaurantId),
      branchId: String(entry.branchId),
    };
  }

  // ==================== ENQUEUE (from Order events) ====================

  /**
   * Create a kitchen queue entry from a confirmed order. Idempotent: one entry
   * per order (unique orderId + pre-check). Reads the order via the trusted
   * system getter — never re-implements order logic.
   */
  async enqueueFromOrder(orderId) {
    const existing = await this.queue.findByOrderId(orderId);
    if (existing) return toKitchenEntryDTO(existing);

    const order = await this.orders.getByIdSystem(orderId);
    if (!order) return null;

    const scope = {
      organizationId: String(order.organizationId),
      restaurantId: String(order.restaurantId),
      branchId: String(order.branchId),
    };
    const stations = await this.stations.findActiveForBranch(scope);
    const { items, stationIds } = this.router.buildItems(stations, order.items ?? []);
    const targetSeconds = await this.sla.resolveTarget(
      scope,
      (order.items ?? []).map((it) => ({ productId: it.productId, categoryId: it.product?.categoryId })),
    );

    const now = new Date();
    let entry;
    try {
      entry = await this.queue.createScoped(scope, {
        orderId,
        orderNumber: order.orderNumber,
        tableId: order.tableId ?? null,
        orderType: order.orderType ?? 'dine_in',
        status: KITCHEN_STATUS.PENDING,
        priority: PRIORITY.NORMAL,
        priorityWeight: PRIORITY_WEIGHT[PRIORITY.NORMAL],
        items,
        stationIds,
        timers: { queuedAt: now },
        sla: { targetSeconds, breached: false },
        timeline: [timelineEntry({ previousStatus: null, newStatus: KITCHEN_STATUS.PENDING, actorType: ACTOR_TYPE.SYSTEM, at: now })],
      });
    } catch (err) {
      if (err?.code === 11000) {
        const dup = await this.queue.findByOrderId(orderId);
        if (dup) return toKitchenEntryDTO(dup);
      }
      throw err;
    }

    await this.#addToBoard(entry);
    await this.events.publish(
      new KitchenOrderQueuedEvent({ entryId: entityId(entry), orderId: String(orderId), branchId: scope.branchId, restaurantId: scope.restaurantId, orderNumber: order.orderNumber }),
    );
    this.realtime.emit(entry, SOCKET_EVENTS.ORDER_QUEUED);
    this.realtime.queueUpdated(entry);
    this.audit.success('kitchen.order.queued', { targetId: entityId(entry), metadata: { orderId: String(orderId) } });
    return toKitchenEntryDTO(entry);
  }

  /**
   * Trusted internal read of a kitchen entry by order id (chef/station/timers/SLA)
   * — used ONLY by the Analytics engine to enrich kitchen projection events.
   * Never exposed on a customer-facing route.
   */
  async getByOrderIdSystem(orderId) {
    const entry = await this.queue.findByOrderId(orderId);
    return entry ? toKitchenEntryDTO(entry) : null;
  }

  /** Cancel a kitchen entry when its order is cancelled (idempotent). */
  async cancelFromOrder(orderId, reason = 'order_cancelled') {
    const entry = await this.queue.findByOrderId(orderId);
    if (!entry || !ACTIVE_KITCHEN_STATUSES.includes(entry.status)) return null;
    return this.#transition(entry, KITCHEN_STATUS.CANCELLED, { actorType: ACTOR_TYPE.SYSTEM, reason });
  }

  // ==================== STAFF TRANSITIONS (API :id = orderId) ====================

  async #loadByOrder(tenant, orderId) {
    const entry = await this.queue.findByOrderId(orderId);
    if (!entry) throw new NotFoundError(KITCHEN_ERRORS.ENTRY_NOT_FOUND);
    assertKitchenAccess(tenant, entry);
    return entry;
  }

  async assign(tenant, orderId, { chefId, mode }, actorId = null) {
    const entry = await this.#loadByOrder(tenant, orderId);
    const assignment = chefId
      ? this.chefs.buildManual(chefId, actorId)
      : await this.chefs.buildAuto(entry, {}, actorId);
    if (!assignment) throw new ConflictError(KITCHEN_ERRORS.CHEF_REQUIRED);
    if (mode) assignment.mode = mode;

    // PENDING → ASSIGNED (transition); already-assigned/preparing → reassign in place.
    if (entry.status === KITCHEN_STATUS.PENDING) {
      const updated = await this.#transition(entry, KITCHEN_STATUS.ASSIGNED, {
        actorId,
        actorType: ACTOR_TYPE.STAFF,
        extraSet: { assignment, 'timers.assignedAt': assignment.assignedAt },
      });
      return updated;
    }
    if (entry.status === KITCHEN_STATUS.ASSIGNED || entry.status === KITCHEN_STATUS.PREPARING) {
      return this.#reassign(entry, assignment, actorId);
    }
    throw new ConflictError(KITCHEN_ERRORS.INVALID_TRANSITION);
  }

  async startPreparing(tenant, orderId, actorId = null) {
    const entry = await this.#loadByOrder(tenant, orderId);
    return this.#transition(entry, KITCHEN_STATUS.PREPARING, {
      actorId,
      actorType: ACTOR_TYPE.CHEF,
      extraSet: { 'timers.preparingAt': new Date() },
    });
  }

  async markReady(tenant, orderId, actorId = null) {
    const entry = await this.#loadByOrder(tenant, orderId);
    return this.#transition(entry, KITCHEN_STATUS.READY, {
      actorId,
      actorType: ACTOR_TYPE.CHEF,
      extraSet: { 'timers.readyAt': new Date() },
    });
  }

  async markServed(tenant, orderId, actorId = null) {
    const entry = await this.#loadByOrder(tenant, orderId);
    return this.#transition(entry, KITCHEN_STATUS.SERVED, {
      actorId,
      actorType: ACTOR_TYPE.STAFF,
      extraSet: { 'timers.servedAt': new Date() },
    });
  }

  async recall(tenant, orderId, { reason = '' } = {}, actorId = null) {
    const entry = await this.#loadByOrder(tenant, orderId);
    const updated = await this.#transition(entry, KITCHEN_STATUS.RECALLED, {
      actorId,
      actorType: ACTOR_TYPE.STAFF,
      reason,
      inc: { recallCount: 1 },
    });
    this.audit.success('kitchen.order.recalled', { actorId, targetId: entityId(entry), metadata: { reason } });
    return updated;
  }

  async refire(tenant, orderId, { reason = '' } = {}, actorId = null) {
    const entry = await this.#loadByOrder(tenant, orderId);
    return this.#transition(entry, KITCHEN_STATUS.REFIRED, {
      actorId,
      actorType: ACTOR_TYPE.STAFF,
      reason,
      inc: { refireCount: 1 },
    });
  }

  async setPriority(tenant, orderId, priority, actorId = null) {
    const entry = await this.#loadByOrder(tenant, orderId);
    return this.lock.withLock(`${REDIS_KEYS.ENTRY_LOCK}:${entityId(entry)}`, async () => {
      const fresh = await this.queue.findByOrderId(orderId);
      const updated = await this.queue.transitionWithVersion(entityId(fresh), fresh.version, {
        set: { priority, priorityWeight: PRIORITY_WEIGHT[priority] ?? 0 },
      });
      if (!updated) throw new ConflictError(KITCHEN_ERRORS.VERSION_CONFLICT);
      await this.#addToBoard(updated); // re-score
      this.realtime.queueUpdated(updated);
      this.audit.success('kitchen.order.priority_changed', { actorId, targetId: entityId(updated), metadata: { priority } });
      return toKitchenEntryDTO(updated);
    });
  }

  // ==================== transition core ====================

  async #reassign(entry, assignment, actorId) {
    return this.lock.withLock(`${REDIS_KEYS.ENTRY_LOCK}:${entityId(entry)}`, async () => {
      const fresh = await this.queue.findByOrderId(String(entry.orderId));
      const updated = await this.queue.transitionWithVersion(entityId(fresh), fresh.version, {
        set: { assignment },
        timelineEntry: timelineEntry({ previousStatus: fresh.status, newStatus: fresh.status, actorId, actorType: ACTOR_TYPE.STAFF, reason: 'reassigned' }),
      });
      if (!updated) throw new ConflictError(KITCHEN_ERRORS.VERSION_CONFLICT);
      this.realtime.emit(updated, STATUS_SOCKET_EVENT[KITCHEN_STATUS.ASSIGNED], { reassigned: true });
      this.audit.success('kitchen.order.reassigned', { actorId, targetId: entityId(updated), metadata: { chefId: String(assignment.currentChefId) } });
      return toKitchenEntryDTO(updated);
    });
  }

  async #transition(entry, toStatus, { actorId = null, actorType = ACTOR_TYPE.SYSTEM, reason = '', extraSet = {}, inc } = {}) {
    const entryId = entityId(entry);
    return this.lock.withLock(
      `${REDIS_KEYS.ENTRY_LOCK}:${entryId}`,
      async () => {
        const fresh = await this.queue.findById(entryId);
        if (!fresh) throw new NotFoundError(KITCHEN_ERRORS.ENTRY_NOT_FOUND);
        assertTransition(fresh.status, toStatus);
        const now = new Date();
        const tl = timelineEntry({ previousStatus: fresh.status, newStatus: toStatus, actorId, actorType, reason, at: now });
        const set = { status: toStatus, ...extraSet };
        const updated = await this.queue.transitionWithVersion(entryId, fresh.version, { set, timelineEntry: tl, inc });
        if (!updated) throw new ConflictError(KITCHEN_ERRORS.VERSION_CONFLICT);
        await this.#postTransition(updated, toStatus, now);
        return toKitchenEntryDTO(updated);
      },
      { ttlMs: 5000 },
    );
  }

  async #postTransition(entry, toStatus, now) {
    // Board + timer bookkeeping.
    if (toStatus === KITCHEN_STATUS.PREPARING && entry.timers?.preparingAt) {
      await this.store.setPrepTimer(entityId(entry), {
        preparingAt: entry.timers.preparingAt,
        targetSeconds: entry.sla?.targetSeconds ?? null,
      }).catch(() => {});
    }
    if ([KITCHEN_STATUS.SERVED, KITCHEN_STATUS.CANCELLED].includes(toStatus)) {
      await this.#removeFromBoard(entry);
    }
    // Retrospective SLA breach at READY (prep exceeded target).
    if (toStatus === KITCHEN_STATUS.READY && !entry.sla?.breached && entry.sla?.targetSeconds && entry.timers?.preparingAt) {
      const prepSecs = (new Date(entry.timers.readyAt ?? now).getTime() - new Date(entry.timers.preparingAt).getTime()) / 1000;
      if (prepSecs > entry.sla.targetSeconds) {
        const marked = await this.queue.markSlaBreached(entityId(entry));
        if (marked) {
          await this.events.publish(new KitchenSlaBreachedEvent({ entryId: entityId(entry), orderId: String(entry.orderId), branchId: String(entry.branchId), restaurantId: String(entry.restaurantId), targetSeconds: entry.sla.targetSeconds }));
        }
      }
      await this.store.delPrepTimer(entityId(entry)).catch(() => {});
    }

    const EventClass = STATUS_EVENT[toStatus];
    if (EventClass) {
      await this.events.publish(
        new EventClass({ entryId: entityId(entry), orderId: String(entry.orderId), branchId: String(entry.branchId), restaurantId: String(entry.restaurantId), status: toStatus }),
      );
    }
    this.realtime.emit(entry, STATUS_SOCKET_EVENT[toStatus]);
    this.realtime.queueUpdated(entry);
    this.audit.success(`kitchen.order.${toStatus}`, { targetId: entityId(entry), metadata: { orderNumber: entry.orderNumber } });
  }

  async #addToBoard(entry) {
    try {
      await this.store.add(String(entry.branchId), (entry.stationIds ?? []).map(String), entityId(entry), {
        priority: entry.priority,
        queuedAt: entry.timers?.queuedAt ?? new Date(),
      });
    } catch (err) {
      this.logger.warn({ err }, 'Kitchen board add failed (continuing; Mongo authoritative)');
    }
  }

  async #removeFromBoard(entry) {
    try {
      await this.store.remove(String(entry.branchId), (entry.stationIds ?? []).map(String), entityId(entry));
    } catch (err) {
      this.logger.warn({ err }, 'Kitchen board remove failed (continuing)');
    }
  }

  // ==================== reads ====================

  async getBoard(tenant, restaurantId, branchId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const filter = query.status ? { status: query.status } : { status: { $in: ACTIVE_KITCHEN_STATUSES } };
    if (query.stationId) filter.stationIds = query.stationId;
    if (query.chefId) filter['assignment.currentChefId'] = query.chefId;
    if (query.priority) filter.priority = query.priority;
    const page = await this.queue.paginateForBranch(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? '-priorityWeight timers.queuedAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, (e) => toKitchenBoardRowDTO(e));
  }

  async getEntry(tenant, orderId) {
    const entry = await this.#loadByOrder(tenant, orderId);
    return toKitchenEntryDTO(entry);
  }

  async getStationBoard(tenant, restaurantId, branchId, stationId) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const entries = await this.queue.findScoped(
      scope,
      { stationIds: stationId, status: { $in: ACTIVE_KITCHEN_STATUSES } },
      { sort: '-priorityWeight timers.queuedAt' },
    );
    return entries.map((e) => toKitchenBoardRowDTO(e));
  }
}

export const kitchenService = new KitchenService();
export default kitchenService;
