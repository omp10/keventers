import { BaseService } from '#core/service/base.service.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '#core/errors/app-error.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { notificationService } from '#platform/notification/index.js';
import { cartService } from '#modules/cart/index.js';
import { branchService, restaurantService } from '#modules/organization/index.js';
import { sessionService } from '#modules/qr-ordering/index.js';

import {
  ACTOR_TYPE,
  CACHE_TTL,
  CANCELLATION_SOURCE,
  CUSTOMER_CANCELLABLE,
  ORDER_ERRORS,
  ORDER_STATUS,
  ORDER_TYPE,
  PAYMENT_STATUS,
  REDIS_KEYS,
  REFUND_STATUS,
  SOCKET_EVENTS,
  STAFF_CANCELLABLE,
  STATUS_SOCKET_EVENT,
} from '../constants/order.constants.js';
import { toOrderDTO, toOrderSummaryDTO } from '../dto/order.dto.js';
import {
  KitchenQueueRequestedEvent,
  OrderCreatedEvent,
  OrderNoteAddedEvent,
  OrderPaymentUpdatedEvent,
  OrderRefundRejectedEvent,
  OrderRefundRequestedEvent,
  OrderRefundedEvent,
  STATUS_EVENT,
} from '../events/order.events.js';
import { orderRepository } from '../repositories/order.repository.js';
import { orderCacheStore } from '../stores/order-cache.store.js';
import { idempotencyStore } from '../stores/idempotency.store.js';
import { entityId } from '../utils/id.util.js';
import {
  assertTransition,
  initialTimeline,
  timelineEntry,
} from '../utils/order-state-machine.js';
import {
  loadForGuest,
  loadForCustomer,
  loadForStaff,
  resolveStaffScope,
} from '../utils/tenant.util.js';

import { orderNumberService } from './order-number.service.js';
import { orderRealtimeService } from './order-realtime.service.js';
import { orderSnapshotService } from './order-snapshot.service.js';

/**
 * Order Management Engine. Transforms a validated cart into a permanent, immutable
 * order and owns its lifecycle. It NEVER computes prices (consumes the Pricing
 * Engine breakdown captured on the locked cart) and NEVER lets a controller move
 * status directly (the Aggregate validates every transition, maintains the
 * timeline, protects invariants and publishes events). Checkout is duplicate-safe
 * (per-session lock + per-cart unique index + idempotency key); transitions are
 * optimistically versioned.
 */
export class OrderService extends BaseService {
  constructor({
    orders = orderRepository,
    carts = cartService,
    numbers = orderNumberService,
    snapshots = orderSnapshotService,
    realtime = orderRealtimeService,
    cache = orderCacheStore,
    idempotency = idempotencyStore,
    lock = distributedLock,
    restaurants = restaurantService,
    branches = branchService,
    sessions = sessionService,
    notifications = notificationService,
    eventBus,
  } = {}) {
    super({ name: 'order', eventBus });
    this.orders = orders;
    this.carts = carts;
    this.numbers = numbers;
    this.snapshots = snapshots;
    this.realtime = realtime;
    this.cache = cache;
    this.idempotency = idempotency;
    this.lock = lock;
    this.restaurants = restaurants;
    this.branches = branches;
    this.sessions = sessions;
    this.notifications = notifications;
  }

  #actor(scope) {
    return scope.customerUserId
      ? { actorId: scope.customerUserId, actorType: ACTOR_TYPE.CUSTOMER }
      : { actorId: null, actorType: ACTOR_TYPE.GUEST };
  }

  #base(order) {
    return {
      orderId: entityId(order),
      orderNumber: order.orderNumber,
      organizationId: String(order.organizationId),
      restaurantId: String(order.restaurantId),
      branchId: String(order.branchId),
      sessionId: order.sessionId,
      status: order.status,
    };
  }

  // ==================== CHECKOUT (cart → order) ====================

  /**
   * Create an order from the session's cart. Flow: getCheckoutCart →
   * cart.lockForCheckout (Pricing Engine runs there) → OrderService.create →
   * cart.convertToOrder. Duplicate-safe.
   */
  async checkout(guestScope, { idempotencyKey } = {}) {
    return this.lock.withLock(
      `${REDIS_KEYS.CHECKOUT_LOCK}:${guestScope.sessionId}`,
      async () => {
        if (idempotencyKey) {
          const prior = await this.idempotency.get(guestScope.sessionId, idempotencyKey);
          if (prior) return prior;
        }

        const cart = await this.carts.getCheckoutCart(guestScope);
        if (!cart) {
          // The cart may already be converted — return the existing order.
          const existing = await this.orders.findLatestBySession(guestScope.sessionId);
          if (existing) return toOrderDTO(existing, { forStaff: false });
          throw new BadRequestError(ORDER_ERRORS.NO_CART);
        }
        if ((cart.items?.length ?? 0) === 0) throw new BadRequestError(ORDER_ERRORS.EMPTY_CART);

        // Idempotency at the data layer: one order per cart.
        const existingForCart = await this.orders.findByCartId(cart.id);
        if (existingForCart) {
          const dto = toOrderDTO(existingForCart, { forStaff: false });
          if (idempotencyKey) await this.idempotency.set(guestScope.sessionId, idempotencyKey, dto, CACHE_TTL.IDEMPOTENCY_SECONDS);
          return dto;
        }

        // Lock the cart (runs the Pricing Engine) if still editable.
        const lockedCart = cart.status === 'active' ? await this.carts.lockForCheckout(guestScope) : cart;

        const dto = await this.#createOrder(guestScope, lockedCart);
        if (idempotencyKey) await this.idempotency.set(guestScope.sessionId, idempotencyKey, dto, CACHE_TTL.IDEMPOTENCY_SECONDS);
        return dto;
      },
      { ttlMs: 8000 },
    );
  }

  async #createOrder(scope, lockedCart) {
    const [restaurant, branch, session] = await Promise.all([
      this.restaurants.getPublicProfile(scope.restaurantId),
      this.branches.getPublicById(scope.branchId),
      this.#safeSession(scope.sessionId),
    ]);
    const orderType = scope.tableId ? ORDER_TYPE.DINE_IN : ORDER_TYPE.TAKEAWAY;
    const orderNumber = await this.numbers.generate(restaurant, orderType);
    const actor = this.#actor(scope);
    const now = new Date();

    let order;
    try {
      order = await this.orders.create({
        organizationId: scope.organizationId,
        restaurantId: scope.restaurantId,
        branchId: scope.branchId,
        sessionId: scope.sessionId,
        guestId: scope.guestId,
        customerUserId: scope.customerUserId,
        tableId: scope.tableId,
        cartId: lockedCart.id,
        orderNumber,
        orderType,
        status: ORDER_STATUS.PLACED,
        items: this.snapshots.buildItems(lockedCart),
        currency: lockedCart.currency ?? 'INR',
        pricing: lockedCart.pricing, // IMMUTABLE Pricing-Engine snapshot
        coupon: lockedCart.coupon ?? null,
        snapshots: this.snapshots.buildSnapshots({ scope, restaurant, branch, session }),
        timeline: initialTimeline({ actorId: actor.actorId, actorType: actor.actorType, at: now }),
        payment: { status: PAYMENT_STATUS.AWAITING_PAYMENT },
        placedAt: now,
        version: 0,
      });
    } catch (err) {
      if (err?.code === 11000) {
        const dup = await this.orders.findByCartId(lockedCart.id);
        if (dup) return toOrderDTO(dup, { forStaff: false });
      }
      throw err;
    }

    // Convert the cart (marks CONVERTED + records coupon redemption). Best-effort:
    // the order already exists; a convert failure must not fail checkout.
    await this.carts.convertToOrder(lockedCart.id, entityId(order)).catch((err) =>
      this.logger.warn({ err, cartId: lockedCart.id }, 'cart convertToOrder failed (order already created)'),
    );

    await this.events.publishMany([new OrderCreatedEvent(this.#base(order)), new (STATUS_EVENT.placed)(this.#base(order))]);
    this.realtime.emit(order, SOCKET_EVENTS.ORDER_PLACED);
    this.audit.success('order.placed', { actorId: actor.actorId, targetId: entityId(order), metadata: { orderNumber } });
    await this.#cache(order);
    await this.#notify(order, 'order_placed');

    return toOrderDTO(order, { forStaff: false });
  }

  async #safeSession(sessionId) {
    try {
      return await this.sessions.getPublicSession(sessionId);
    } catch {
      return null;
    }
  }

  /**
   * Customer stats the coupon engine needs to enforce audience + per-customer
   * caps: how many (non-cancelled) orders this customer has placed at the
   * restaurant, and how many of them redeemed a given coupon code. Cheap read
   * over the `{ customerUserId }` index; cancelled orders don't count as a
   * "prior order" (a first order that failed shouldn't burn a first-timer offer).
   */
  async getCustomerCouponStats(customerUserId, restaurantId, couponCode = null) {
    if (!customerUserId || !restaurantId) return { orderCount: 0, couponUses: 0 };
    const orders = await this.orders.findByCustomer(String(restaurantId), String(customerUserId), { limit: 500 });
    const active = orders.filter((o) => o.status !== ORDER_STATUS.CANCELLED);
    const wanted = couponCode ? String(couponCode).toUpperCase() : null;
    const couponUses = wanted
      ? active.filter((o) => String(o.coupon?.code ?? '').toUpperCase() === wanted).length
      : 0;
    return { orderCount: active.length, couponUses };
  }

  // ==================== TRANSITIONS (Aggregate) ====================

  /**
   * Apply a guarded, optimistically-versioned transition. Serialized per order
   * (Redis lock), validated by the state machine, timeline appended atomically,
   * then events / realtime / audit / cache / notification fan out.
   */
  async #transition(orderId, toStatus, { actorId = null, actorType = ACTOR_TYPE.SYSTEM, reason = '', extraSet = {} }) {
    return this.lock.withLock(
      `${REDIS_KEYS.ORDER_LOCK}:${orderId}`,
      async () => {
        const fresh = await this.orders.findById(orderId);
        if (!fresh) throw new NotFoundError(ORDER_ERRORS.ORDER_NOT_FOUND);
        assertTransition(fresh.status, toStatus);

        const now = new Date();
        const entry = timelineEntry({ previousStatus: fresh.status, newStatus: toStatus, actorId, actorType, reason, at: now });
        const set = { status: toStatus, ...this.#timestampFor(toStatus, now), ...extraSet };
        const updated = await this.orders.transitionWithVersion(orderId, fresh.version, { set, timelineEntry: entry });
        if (!updated) throw new ConflictError(ORDER_ERRORS.VERSION_CONFLICT);

        await this.#postTransition(updated, toStatus, { reason, actorId });
        return updated;
      },
      { ttlMs: 5000 },
    );
  }

  #timestampFor(status, now) {
    const map = {
      [ORDER_STATUS.PLACED]: { placedAt: now },
      [ORDER_STATUS.CONFIRMED]: { confirmedAt: now },
      [ORDER_STATUS.READY]: { readyAt: now },
      [ORDER_STATUS.SERVED]: { servedAt: now },
      [ORDER_STATUS.COMPLETED]: { completedAt: now },
      [ORDER_STATUS.CANCELLED]: { cancelledAt: now },
    };
    return map[status] ?? {};
  }

  async #postTransition(order, toStatus, { reason, actorId }) {
    const base = { ...this.#base(order), reason };
    const EventClass = STATUS_EVENT[toStatus];
    const events = [];
    if (EventClass) events.push(new EventClass(base));
    // Kitchen seam: on CONFIRMED, request a kitchen queue entry (event only).
    if (toStatus === ORDER_STATUS.CONFIRMED) {
      events.push(new KitchenQueueRequestedEvent({ ...base, tableId: order.tableId ? String(order.tableId) : null }));
    }
    if (events.length) await this.events.publishMany(events);

    this.realtime.emit(order, STATUS_SOCKET_EVENT[toStatus]);
    this.audit.success(`order.${toStatus}`, { actorId, targetId: entityId(order), metadata: { orderNumber: order.orderNumber } });
    await this.#cache(order);
    await this.#notify(order, `order_${toStatus}`);
  }

  // ==================== STAFF TRANSITIONS ====================

  async confirm(tenant, id, actorId = null) {
    await loadForStaff(this.orders, tenant, id);
    return toOrderDTO(await this.#transition(id, ORDER_STATUS.CONFIRMED, { actorId, actorType: ACTOR_TYPE.RESTAURANT }), { forStaff: true });
  }

  async prepare(tenant, id, actorId = null) {
    await loadForStaff(this.orders, tenant, id);
    return toOrderDTO(await this.#transition(id, ORDER_STATUS.PREPARING, { actorId, actorType: ACTOR_TYPE.RESTAURANT }), { forStaff: true });
  }

  async ready(tenant, id, actorId = null) {
    await loadForStaff(this.orders, tenant, id);
    return toOrderDTO(await this.#transition(id, ORDER_STATUS.READY, { actorId, actorType: ACTOR_TYPE.RESTAURANT }), { forStaff: true });
  }

  async serve(tenant, id, actorId = null) {
    await loadForStaff(this.orders, tenant, id);
    return toOrderDTO(await this.#transition(id, ORDER_STATUS.SERVED, { actorId, actorType: ACTOR_TYPE.RESTAURANT }), { forStaff: true });
  }

  async complete(tenant, id, actorId = null) {
    await loadForStaff(this.orders, tenant, id);
    return toOrderDTO(await this.#transition(id, ORDER_STATUS.COMPLETED, { actorId, actorType: ACTOR_TYPE.RESTAURANT }), { forStaff: true });
  }

  /**
   * Advance an order from a KITCHEN transition (event-driven, no tenant check —
   * the kitchen already authorized the actor and owns the same order).
   *
   * The kitchen and the order each run their own state machine; this is the
   * return leg of the seam whose outbound half is `order.confirmed → enqueue`.
   * Without it the kitchen can cook and serve while the customer's order sits at
   * "confirmed" forever.
   *
   * Illegal/duplicate transitions are swallowed: the kitchen is allowed to move
   * in ways the order doesn't mirror (recall/refire), and staff may have already
   * advanced the order by hand.
   */
  async syncFromKitchen(orderId, toStatus) {
    // The kitchen may be AHEAD of the order: it enqueues on `placed`, so when
    // the chef starts cooking a not-yet-confirmed order the target is two steps
    // away (placed → confirmed → preparing) and a single jump is illegal — the
    // catch swallowed it and the customer's tracker sat at "placed" while food
    // cooked. Cooking IS acceptance: walk the progression one legal step at a
    // time so every intermediate status (and its events/notifications) fires.
    const path = [
      ORDER_STATUS.PLACED,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY,
      ORDER_STATUS.SERVED,
    ];
    const target = path.indexOf(toStatus);
    if (target === -1) return null; // non-progression states are not mirrored

    const order = await this.orders.findById(orderId);
    if (!order) return null;
    let result = null;
    for (let current = path.indexOf(order.status); current !== -1 && current < target; current += 1) {
      try {
        result = await this.#transition(orderId, path[current + 1], { actorType: ACTOR_TYPE.SYSTEM, reason: 'kitchen' });
      } catch {
        // Not a legal move for the order right now — the kitchen stays
        // authoritative for its own board; staff can still drive the order.
        return result;
      }
    }
    return result;
  }

  /** Generic staff status change (PATCH). Legality enforced by the state machine. */
  async updateStatus(tenant, id, toStatus, { reason = '' } = {}, actorId = null) {
    await loadForStaff(this.orders, tenant, id);
    return toOrderDTO(await this.#transition(id, toStatus, { actorId, actorType: ACTOR_TYPE.RESTAURANT, reason }), { forStaff: true });
  }

  async cancelByStaff(tenant, id, { reason = '', source = CANCELLATION_SOURCE.RESTAURANT } = {}, actorId = null) {
    const order = await loadForStaff(this.orders, tenant, id);
    if (!STAFF_CANCELLABLE.includes(order.status)) throw new BadRequestError(ORDER_ERRORS.NOT_CANCELLABLE);
    const actorType = source === CANCELLATION_SOURCE.PLATFORM ? ACTOR_TYPE.PLATFORM : ACTOR_TYPE.RESTAURANT;
    const updated = await this.#transition(id, ORDER_STATUS.CANCELLED, {
      actorId,
      actorType,
      reason,
      extraSet: { cancellation: { source, reason, actorId, actorType, at: new Date() } },
    });
    this.audit.success('order.cancelled', { actorId, targetId: id, metadata: { source, reason } });
    return toOrderDTO(updated, { forStaff: true });
  }

  // ==================== CUSTOMER ====================

  /** `access` is { sessionId, userId } — either identity may own the order. */
  async cancelByCustomer(access, id, { reason = '' } = {}) {
    const order = await loadForCustomer(this.orders, access, id);
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) throw new BadRequestError(ORDER_ERRORS.NOT_CANCELLABLE);
    const actor = this.#actor({ customerUserId: access.userId ?? access.customerUserId ?? null });
    const updated = await this.#transition(id, ORDER_STATUS.CANCELLED, {
      actorId: actor.actorId,
      actorType: actor.actorType,
      reason,
      extraSet: { cancellation: { source: CANCELLATION_SOURCE.CUSTOMER, reason, actorId: actor.actorId, actorType: actor.actorType, at: new Date() } },
    });
    return toOrderDTO(updated, { forStaff: false });
  }

  async getForGuest(access, id) {
    const order = await loadForCustomer(this.orders, access, id);
    return toOrderDTO(order, { forStaff: false });
  }

  async listForGuest(guestScope, query = {}) {
    const page = await this.orders.paginateForSession(guestScope.sessionId, {
      filter: query.status ? { status: query.status } : {},
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.#summaryPage(page);
  }

  /**
   * A signed-in customer's order history, across sessions and restaurants. The
   * caller must have already established that `customerUserId` is the requester's
   * own id (never a client-supplied one).
   */
  async listForCustomer(customerUserId, query = {}) {
    const page = await this.orders.paginateForCustomer(customerUserId, {
      filter: query.status ? { status: query.status } : {},
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.#summaryPage(page);
  }

  /**
   * Summarize a page and attach each order's BRANCH (name + slug).
   *
   * Orders store only a branchId, and the customer app used to fall back to a
   * client-side cache of the branch you're standing in — so every past order
   * from another outlet rendered a blank name. One batched lookup per page
   * fixes it without an N+1.
   */
  async #summaryPage(page) {
    const summaries = (page.items ?? []).map((o) => toOrderSummaryDTO(o, { forStaff: false }));
    // Same envelope the rest of the API returns ({ items, pagination }).
    return { items: await this.#withOutletNames(summaries), pagination: page.meta };
  }

  // ==================== STAFF READS ====================

  async getForStaff(tenant, id) {
    const order = await loadForStaff(this.orders, tenant, id);
    // Resolve the outlet NAME, not just its id. The staff detail drawer shows
    // "Branch", and shipping only `branchId` meant it read `order.branch.name`
    // off an object that was never sent — every order detail crashed the drawer.
    const [dto] = await this.#withOutletNames([toOrderDTO(order, { forStaff: true })]);
    // Resolve the TABLE too. An order stores only `tableId`, so every staff and
    // admin surface was left rendering an ObjectId (or "see ids") for the one
    // detail that actually locates the order in the room. Single-order read
    // only — the list path must not pay a lookup per row.
    if (dto?.tableId && !dto.table) {
      try {
        const { tableService } = await import('#modules/qr-ordering/index.js');
        const table = await tableService.getPublicById(String(dto.tableId));
        if (table) dto.table = { id: String(table.id ?? dto.tableId), number: table.number ?? null, name: table.name ?? null };
      } catch {
        /* a label is a nicety — never fail the order read over it */
      }
    }
    return dto;
  }

  /**
   * Trusted read by id WITHOUT a tenant check — for INTERNAL event-driven
   * consumers (e.g. the Kitchen module enqueuing on order.confirmed). The caller
   * is a system context reacting to an order the module itself published; the
   * returned DTO already carries the order's own tenant ids for scoping.
   */
  async getByIdSystem(id) {
    const order = await this.orders.findById(id);
    return order ? toOrderDTO(order, { forStaff: true }) : null;
  }

  /**
   * Trusted internal listing of a customer's orders within a restaurant (no
   * tenant check — for the Customer Platform to render history + rebuild
   * analytics projections on a merge). Never exposed on a customer-facing route.
   */
  async listForCustomerSystem(restaurantId, customerUserId, { statuses = null, limit = 1000 } = {}) {
    const orders = await this.orders.findByCustomer(restaurantId, customerUserId, { statuses, limit });
    return orders.map((o) => toOrderDTO(o, { forStaff: true }));
  }

  /**
   * Trusted internal listing of a restaurant's orders within a time window — for
   * the Analytics rebuild/reconciliation paths ONLY (recompute projections from
   * authoritative data). Never exposed on a customer-facing route.
   */
  async listForRestaurantSystem(restaurantId, { from = null, to = null, statuses = null, limit = 5000 } = {}) {
    const orders = await this.orders.findByRestaurantRange(restaurantId, { from, to, statuses, limit });
    return orders.map((o) => toOrderDTO(o, { forStaff: true }));
  }

  /**
   * Trusted keyset-paginated batch of a restaurant's orders (Analytics rebuild) —
   * memory-safe streaming of the order history. Returns lean DTOs + the cursor for
   * the next page.
   */
  async listForRestaurantBatchSystem(restaurantId, opts = {}) {
    const orders = await this.orders.findByRestaurantBatch(restaurantId, opts);
    const items = orders.map((o) => toOrderDTO(o, { forStaff: true }));
    const last = orders.length ? orders[orders.length - 1] : null;
    return { items, cursor: last ? { afterCreatedAt: last.createdAt, afterId: last._id } : null, done: orders.length < (opts.limit ?? 500) };
  }

  /** Trusted server-side authoritative sales aggregate (Analytics reconciliation). */
  aggregateSalesForRestaurantSystem(restaurantId, opts = {}) {
    return this.orders.aggregateSalesForRestaurant(restaurantId, opts);
  }

  async listForStaff(tenant, restaurantId, branchId, query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.orderType) filter.orderType = query.orderType;
    if (query.customerUserId) filter.customerUserId = query.customerUserId;
    const params = {
      filter,
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    };

    // PLATFORM-WIDE for a Super Admin who named no restaurant — they own none,
    // so scoping threw and "track every order" was unreachable. Indexes
    // {createdAt:-1} and {status:1,createdAt:-1} back this query.
    const page = tenant?.isSuperAdmin && !restaurantId
      ? await this.orders.paginate({ ...params, allowedFilterFields: ['status', 'orderType', 'customerUserId'] })
      : await this.orders.paginateForStaff(await resolveStaffScope(tenant, restaurantId, branchId), params);

    const summaries = (page.items ?? []).map((o) => toOrderSummaryDTO(o, { forStaff: true }));
    return { items: await this.#withOutletNames(summaries), pagination: page.meta };
  }

  /**
   * Zip restaurant + branch NAMES onto a page of summaries — two batched
   * queries for the whole page, never one per row. A platform-wide list spans
   * outlets, so ids alone are unreadable.
   */
  async #withOutletNames(summaries) {
    if (!summaries.length) return summaries;
    try {
      const { branchService, restaurantService } = await import('#modules/organization/index.js');
      const [branches, restaurants] = await Promise.all([
        branchService.getPublicByIds(summaries.map((s) => s?.branchId).filter(Boolean)),
        restaurantService.getPublicByIds(summaries.map((s) => s?.restaurantId).filter(Boolean)),
      ]);
      return summaries.map((s) => {
        const b = s?.branchId ? branches.get(String(s.branchId)) : null;
        const r = s?.restaurantId ? restaurants.get(String(s.restaurantId)) : null;
        return {
          ...s,
          branch: b ? { id: String(b.id), name: b.name ?? '', slug: b.slug ?? '' } : null,
          restaurant: r ? { id: String(r.id), name: r.name ?? '' } : null,
        };
      });
    } catch {
      return summaries; // names are a nicety — never fail the list over them
    }
  }

  /**
   * HARD-DELETE an order — Super Admin only, and genuinely irreversible.
   *
   * Cascades to the kitchen ticket. An order's ticket is 1:1 with it, so
   * removing the order alone leaves a ghost on the KDS board: a card the cooks
   * can see and act on for an order that no longer exists. Feedback and
   * analytics are left alone deliberately — ratings are their own record, and
   * projections are rebuildable, so silently rewriting either from a delete
   * would be a bigger surprise than leaving them.
   */
  async deleteByAdmin(orderId, actorId = null) {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError(ORDER_ERRORS.ORDER_NOT_FOUND);

    await this.orders.deleteById(orderId);
    // Best-effort cascade: the order is already gone, so a failure here must
    // not surface as "delete failed" — it is logged and left for cleanup.
    try {
      const { kitchenService } = await import('#modules/kitchen/index.js');
      await kitchenService.deleteForOrderSystem(orderId);
    } catch (err) {
      this.logger.warn({ err, orderId }, 'Kitchen ticket cleanup failed after order delete');
    }

    this.audit.success('order.deleted', {
      actorId,
      targetId: String(orderId),
      metadata: { orderNumber: order.orderNumber, status: order.status },
    });
    return { id: String(orderId), orderNumber: order.orderNumber, deleted: true };
  }

  // ==================== NOTES ====================

  async addNote(tenant, id, { type, body, visibility }, actorId = null) {
    const order = await loadForStaff(this.orders, tenant, id);
    const note = { type, body, visibility, authorId: actorId, authorType: ACTOR_TYPE.RESTAURANT, at: new Date() };
    const updated = await this.orders.addNote(entityId(order), note);
    await this.events.publish(new OrderNoteAddedEvent({ ...this.#base(updated), noteType: type }));
    this.audit.success('order.note_added', { actorId, targetId: id, metadata: { type } });
    return toOrderDTO(updated, { forStaff: true });
  }

  // ==================== REFUND (extension point) ====================

  async requestRefund(tenant, id, { reason = '' } = {}, actorId = null) {
    const order = await loadForStaff(this.orders, tenant, id);
    if (order.status !== ORDER_STATUS.COMPLETED) throw new BadRequestError(ORDER_ERRORS.REFUND_NOT_ALLOWED);
    const updated = await this.#transition(id, ORDER_STATUS.REFUND_PENDING, {
      actorId,
      actorType: ACTOR_TYPE.RESTAURANT,
      reason,
      extraSet: { refund: { status: REFUND_STATUS.REQUESTED, reason, requestedBy: actorId, requestedAt: new Date() } },
    });
    await this.events.publish(new OrderRefundRequestedEvent({ ...this.#base(updated), reason }));
    this.audit.success('order.refund_requested', { actorId, targetId: id, metadata: { reason } });
    return toOrderDTO(updated, { forStaff: true });
  }

  async approveRefund(tenant, id, actorId = null) {
    const order = await loadForStaff(this.orders, tenant, id);
    if (order.status !== ORDER_STATUS.REFUND_PENDING) throw new BadRequestError(ORDER_ERRORS.REFUND_NOT_ALLOWED);
    const updated = await this.#transition(id, ORDER_STATUS.REFUNDED, {
      actorId,
      actorType: ACTOR_TYPE.PLATFORM,
      extraSet: { refund: { status: REFUND_STATUS.COMPLETED, resolvedBy: actorId, resolvedAt: new Date() } },
    });
    await this.events.publish(new OrderRefundedEvent(this.#base(updated)));
    this.audit.success('order.refunded', { actorId, targetId: id });
    return toOrderDTO(updated, { forStaff: true });
  }

  async rejectRefund(tenant, id, { reason = '' } = {}, actorId = null) {
    const order = await loadForStaff(this.orders, tenant, id);
    if (order.status !== ORDER_STATUS.REFUND_PENDING) throw new BadRequestError(ORDER_ERRORS.REFUND_NOT_ALLOWED);
    const updated = await this.#transition(id, ORDER_STATUS.COMPLETED, {
      actorId,
      actorType: ACTOR_TYPE.PLATFORM,
      reason,
      extraSet: { refund: { status: REFUND_STATUS.REJECTED, reason, resolvedBy: actorId, resolvedAt: new Date() } },
    });
    await this.events.publish(new OrderRefundRejectedEvent({ ...this.#base(updated), reason }));
    this.audit.success('order.refund_rejected', { actorId, targetId: id });
    return toOrderDTO(updated, { forStaff: true });
  }

  // ==================== PAYMENT (extension point) ====================

  /**
   * Record a payment status change. Called by a future Payments module (via DI)
   * or an event handler — the order stores only the STATUS, never card details.
   */
  async recordPaymentStatus(orderId, status, { reference = null } = {}) {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError(ORDER_ERRORS.ORDER_NOT_FOUND);
    const updated = await this.orders.updateById(orderId, {
      payment: { status, reference, updatedAt: new Date() },
    });
    await this.events.publish(new OrderPaymentUpdatedEvent({ ...this.#base(updated), paymentStatus: status }));
    this.audit.success('order.payment_updated', { targetId: String(orderId), metadata: { status } });
    return toOrderDTO(updated, { forStaff: true });
  }

  /** Backfill the customer on a session's orders when a guest links an account. */
  async linkCustomerBySession(sessionId, customerUserId) {
    const res = await this.orders.linkCustomerBySession(sessionId, customerUserId);
    this.audit.success('order.customer_linked', { actorId: String(customerUserId), metadata: { sessionId } });
    return { linked: res?.modifiedCount ?? 0 };
  }

  // ==================== helpers ====================

  async #cache(order) {
    try {
      await this.cache.save(entityId(order), toOrderDTO(order, { forStaff: true }), CACHE_TTL.ORDER_SECONDS);
    } catch (err) {
      this.logger.warn({ err }, 'Order cache write failed (continuing)');
    }
  }

  async #notify(order, templateId) {
    try {
      await this.notifications.send('push', {
        to: order.customerUserId ? String(order.customerUserId) : order.sessionId,
        templateId,
        data: { orderNumber: order.orderNumber, status: order.status },
      });
    } catch (err) {
      this.logger.warn({ err, templateId }, 'Order notification failed (continuing)');
    }
  }
}

export const orderService = new OrderService();
export default orderService;
