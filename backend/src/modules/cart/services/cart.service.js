import { BaseService } from '#core/service/base.service.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '#core/errors/app-error.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { config } from '#config';
import { couponService } from '#modules/pricing/index.js';
import { sessionService } from '#modules/qr-ordering/index.js';

import {
  CART_ERRORS,
  CART_STATUS,
  EDITABLE_CART_STATUSES,
  LIVE_CART_STATUSES,
  REDIS_KEYS,
} from '../constants/cart.constants.js';
import { toCartDTO } from '../dto/cart.dto.js';
import {
  CartAbandonedEvent,
  CartConvertedEvent,
  CartCreatedEvent,
  CartExpiredEvent,
  CartItemAddedEvent,
  CartItemRemovedEvent,
  CartItemUpdatedEvent,
  CartLockedEvent,
  CartUpdatedEvent,
  CouponAppliedEvent,
  CouponRemovedEvent,
} from '../events/cart.events.js';
import { cartRepository } from '../repositories/cart.repository.js';
import { cartCacheStore } from '../stores/cart-cache.store.js';
import { idempotencyStore } from '../stores/idempotency.store.js';
import { assertCartAccess } from '../utils/tenant.util.js';

import { cartPricingService } from './cart-pricing.service.js';
import { cartValidationService } from './cart-validation.service.js';

/**
 * Cart orchestration — the editable representation of an order, owned by a guest
 * session. NEVER computes prices itself (defers to the Pricing Engine) and NEVER
 * creates orders (exposes lockForCheckout / convertToOrder as the clean
 * boundary the Order Engine consumes). Mutations are serialized per-cart (Redis
 * lock), optimistically versioned (concurrent-device safety) and idempotent
 * (safe retries). All money is integer minor units.
 */
export class CartService extends BaseService {
  constructor({
    carts = cartRepository,
    cache = cartCacheStore,
    idempotency = idempotencyStore,
    lock = distributedLock,
    validation = cartValidationService,
    pricing = cartPricingService,
    coupons = couponService,
    sessions = sessionService,
    cartConfig = config.cart,
    eventBus,
  } = {}) {
    super({ name: 'cart', eventBus });
    this.carts = carts;
    this.cache = cache;
    this.idempotency = idempotency;
    this.lock = lock;
    this.validation = validation;
    this.pricing = pricing;
    this.coupons = coupons;
    this.sessions = sessions;
    this.cartConfig = cartConfig;
  }

  #now() {
    return new Date();
  }

  #expiry() {
    return new Date(Date.now() + this.cartConfig.expirationSeconds * 1000);
  }

  #cartId(cart) {
    return String(cart._id ?? cart.id);
  }

  // --- reads ---

  /** Get the session's active cart (Redis → Mongo), or null. */
  async getActiveCart(scope) {
    const cart = await this.carts.findActiveBySession(scope);
    if (!cart) return null;
    assertCartAccess(scope, cart);
    return toCartDTO(cart);
  }

  /**
   * The cart the Order Engine checks out (ACTIVE or an already-LOCKED cart from a
   * prior attempt), or null. Consumed by the Order module's checkout flow.
   */
  async getCheckoutCart(scope) {
    const cart = await this.carts.findForCheckout(scope);
    if (!cart) return null;
    assertCartAccess(scope, cart);
    return toCartDTO(cart);
  }

  /** Get-or-create the session's single active cart. */
  async getOrCreateCart(scope, actorId = null) {
    const existing = await this.carts.findActiveBySession(scope);
    if (existing) return toCartDTO(existing);
    return this.#createCart(scope, actorId);
  }

  async #createCart(scope, actorId = null) {
    try {
      const cart = await this.carts.createScoped(scope, {
        guestId: scope.guestId,
        customerUserId: scope.customerUserId,
        tableId: scope.tableId,
        currency: 'INR',
        status: CART_STATUS.ACTIVE,
        items: [],
        version: 0,
        expiresAt: this.#expiry(),
        lastActivityAt: this.#now(),
        pricing: null,
      });
      await this.#cache(cart);
      await this.events.publish(
        new CartCreatedEvent({ cartId: this.#cartId(cart), sessionId: scope.sessionId, branchId: scope.branchId }),
      );
      this.audit.success('cart.created', { actorId, targetId: this.#cartId(cart) });
      return toCartDTO(cart);
    } catch (err) {
      // Partial-unique race: another request created the active cart first.
      if (err?.code === 11000) {
        const cart = await this.carts.findActiveBySession(scope);
        if (cart) return toCartDTO(cart);
      }
      throw err;
    }
  }

  // --- mutations (serialized + versioned + idempotent) ---

  /**
   * Central mutation pipeline. `work(cart, { restaurant })` returns
   * `{ items?, coupon?, events }`; the wrapper recomputes pricing, writes with an
   * optimistic version guard, refreshes the cache and publishes events.
   */
  async #mutate(scope, { version, idempotencyKey, requireContext = true } = {}, work) {
    const active = await this.carts.findForCheckout(scope);
    if (!active) throw new NotFoundError(CART_ERRORS.CART_NOT_FOUND);
    const cartId = this.#cartId(active);

    if (idempotencyKey) {
      const prior = await this.idempotency.get(cartId, idempotencyKey);
      if (prior) return prior;
    }

    const result = await this.lock.withLock(
      `${REDIS_KEYS.CART_LOCK}:${cartId}`,
      async () => {
        const cart = await this.carts.findByIdForSession(scope, cartId);
        if (!cart) throw new NotFoundError(CART_ERRORS.CART_NOT_FOUND);
        assertCartAccess(scope, cart);
        this.#assertEditable(cart);
        if (version != null && Number(version) !== cart.version) {
          throw new ConflictError(CART_ERRORS.VERSION_CONFLICT);
        }

        const now = this.#now();
        const restaurant = requireContext
          ? (await this.validation.validateOrderingContext(scope, now)).restaurant
          : await this.validation.restaurants.getPublicProfile(scope.restaurantId);

        const outcome = await work(cart, { restaurant, now });
        const items = outcome.items ?? cart.items;
        const coupon = outcome.coupon !== undefined ? outcome.coupon : cart.coupon;

        const couponSnapshot = await this.#resolveCouponSnapshot(scope, coupon);
        const pricing = this.pricing.compute({ ...cart, items, coupon, currency: cart.currency }, restaurant, couponSnapshot, now);

        const patch = {
          items,
          coupon: coupon ?? { couponId: null, code: null, snapshot: null },
          pricing,
          status: CART_STATUS.ACTIVE,
          lastActivityAt: now,
          expiresAt: this.#expiry(),
        };
        const updated = await this.carts.updateWithVersion(cartId, cart.version, patch);
        if (!updated) throw new ConflictError(CART_ERRORS.VERSION_CONFLICT);

        await this.#cache(updated);
        await this.events.publishMany([
          ...(outcome.events ?? []),
          new CartUpdatedEvent({ cartId, sessionId: scope.sessionId, version: updated.version }),
        ]);
        return toCartDTO(updated);
      },
      { ttlMs: this.cartConfig.lockTtlMs },
    );

    if (idempotencyKey) {
      await this.idempotency.set(cartId, idempotencyKey, result, this.cartConfig.idempotencyTtlSeconds);
    }
    return result;
  }

  async addItem(scope, input, opts = {}) {
    const existing = await this.carts.findForCheckout(scope);
    if (!existing) await this.getOrCreateCart(scope);
    const mutationOpts = { ...opts, version: opts.version ?? input.version };
    return this.#mutate(scope, mutationOpts, async (cart) => {
      const item = await this.validation.resolveItem(scope, input, cart.currency);
      
      const existingItemIndex = (cart.items ?? []).findIndex((it) => {
        if (String(it.productId) !== String(item.productId)) return false;
        if (String(it.variantId ?? '') !== String(item.variantId ?? '')) return false;

        const itMods = (it.modifiers ?? []).map(m => String(m.modifierId)).sort().join(',');
        const newMods = (item.modifiers ?? []).map(m => String(m.modifierId)).sort().join(',');
        if (itMods !== newMods) return false;

        const itAddons = (it.addons ?? []).map(a => String(a.addonId)).sort().join(',');
        const newAddons = (item.addons ?? []).map(a => String(a.addonId)).sort().join(',');
        if (itAddons !== newAddons) return false;

        if ((it.specialInstructions ?? '') !== (item.specialInstructions ?? '')) return false;
        if ((it.notes ?? '') !== (item.notes ?? '')) return false;

        return true;
      });

      let items;
      if (existingItemIndex !== -1) {
        items = cart.items.map((it, idx) => {
          if (idx !== existingItemIndex) return it;
          const next = it.toObject ? it.toObject() : { ...it };
          next.quantity += item.quantity;
          next.lineSubtotal = (next.pricing?.unitPrice ?? 0) * next.quantity;
          return next;
        });
      } else {
        if ((cart.items?.length ?? 0) >= this.cartConfig.maxItems) {
          throw new BadRequestError(CART_ERRORS.MAX_ITEMS);
        }
        items = [...cart.items, item];
      }

      this.audit.success('cart.item.added', { targetId: this.#cartId(cart), metadata: { productId: item.productId } });
      return {
        items,
        events: [new CartItemAddedEvent({ cartId: this.#cartId(cart), productId: String(item.productId), quantity: item.quantity })],
      };
    });
  }

  async updateItem(scope, itemId, input, opts = {}) {
    return this.#mutate(scope, { ...opts, requireContext: false }, async (cart) => {
      const items = cart.items.map((it) => {
        if (String(it._id) !== String(itemId)) return it;
        const next = it.toObject ? it.toObject() : { ...it };
        if (input.quantity !== undefined) next.quantity = Math.max(1, Math.trunc(input.quantity));
        if (input.specialInstructions !== undefined) next.specialInstructions = input.specialInstructions;
        if (input.notes !== undefined) next.notes = input.notes;
        next.lineSubtotal = (next.pricing?.unitPrice ?? 0) * next.quantity;
        return next;
      });
      if (!cart.items.some((it) => String(it._id) === String(itemId))) {
        throw new NotFoundError(CART_ERRORS.ITEM_NOT_FOUND);
      }
      this.audit.success('cart.item.updated', { targetId: this.#cartId(cart), metadata: { itemId: String(itemId) } });
      return {
        items,
        events: [new CartItemUpdatedEvent({ cartId: this.#cartId(cart), itemId: String(itemId) })],
      };
    });
  }

  async removeItem(scope, itemId, opts = {}) {
    return this.#mutate(scope, { ...opts, requireContext: false }, async (cart) => {
      if (!cart.items.some((it) => String(it._id) === String(itemId))) {
        throw new NotFoundError(CART_ERRORS.ITEM_NOT_FOUND);
      }
      const items = cart.items.filter((it) => String(it._id) !== String(itemId));
      this.audit.success('cart.item.removed', { targetId: this.#cartId(cart), metadata: { itemId: String(itemId) } });
      return {
        items,
        events: [new CartItemRemovedEvent({ cartId: this.#cartId(cart), itemId: String(itemId) })],
      };
    });
  }

  async applyCoupon(scope, code, opts = {}) {
    return this.#mutate(scope, opts, async (cart, { restaurant, now }) => {
      const coupon = await this.coupons.resolveForApply(
        { organizationId: scope.organizationId, restaurantId: scope.restaurantId },
        code,
      );
      if (!coupon) throw new BadRequestError(CART_ERRORS.COUPON_INVALID);
      // Dry-run the engine to confirm the coupon actually applies to this cart.
      const snapshot = this.#couponSnapshot(coupon);
      const preview = this.pricing.compute({ ...cart, coupon: { code }, currency: cart.currency }, restaurant, snapshot, now);
      if (!preview.discounts.couponApplied) {
        throw new BadRequestError(`${CART_ERRORS.COUPON_INVALID}: ${preview.discounts.couponReason ?? 'not eligible'}`);
      }
      this.audit.success('cart.coupon.applied', { targetId: this.#cartId(cart), metadata: { code } });
      return {
        coupon: { couponId: coupon._id ?? coupon.id, code: coupon.code },
        events: [new CouponAppliedEvent({ cartId: this.#cartId(cart), code: coupon.code })],
      };
    });
  }

  async removeCoupon(scope, opts = {}) {
    return this.#mutate(scope, { ...opts, requireContext: false }, async (cart) => {
      this.audit.success('cart.coupon.removed', { targetId: this.#cartId(cart) });
      return {
        coupon: { couponId: null, code: null, snapshot: null },
        events: [new CouponRemovedEvent({ cartId: this.#cartId(cart) })],
      };
    });
  }

  async updateCart(scope, input, opts = {}) {
    return this.#mutate(scope, { ...opts, requireContext: false }, async (cart) => {
      this.audit.success('cart.updated', { targetId: this.#cartId(cart) });
      return { notes: input.notes, events: [] };
    });
  }

  /** Re-validate against LIVE catalog + restaurant config and recompute. */
  async recalculate(scope, opts = {}) {
    return this.#mutate(scope, opts, async () => ({ events: [] }));
  }

  // --- lifecycle / checkout boundary ---

  /**
   * Order-conversion boundary. Validates + LOCKS the cart for checkout (no more
   * edits) and marks the guest session CHECKOUT_PENDING. Returns the locked cart
   * with final pricing. The Order Engine consumes this — the cart never creates
   * orders itself.
   */
  async lockForCheckout(scope, actorId = null) {
    const active = await this.carts.findActiveBySession(scope);
    if (!active) throw new NotFoundError(CART_ERRORS.CART_NOT_FOUND);
    const cartId = this.#cartId(active);

    return this.lock.withLock(
      `${REDIS_KEYS.CART_LOCK}:${cartId}`,
      async () => {
        const cart = await this.carts.findByIdForSession(scope, cartId);
        if (!cart) throw new NotFoundError(CART_ERRORS.CART_NOT_FOUND);
        if (cart.status !== CART_STATUS.ACTIVE) throw new ForbiddenError(CART_ERRORS.CART_NOT_EDITABLE);
        if ((cart.items?.length ?? 0) === 0) throw new BadRequestError(CART_ERRORS.EMPTY_CART);

        const now = this.#now();
        const { restaurant } = await this.validation.validateOrderingContext(scope, now);
        const couponSnapshot = await this.#resolveCouponSnapshot(scope, cart.coupon);
        const pricing = this.pricing.compute(cart, restaurant, couponSnapshot, now);

        const updated = await this.carts.updateWithVersion(cartId, cart.version, {
          status: CART_STATUS.LOCKED,
          pricing,
          lockedAt: now,
          lastActivityAt: now,
        });
        if (!updated) throw new ConflictError(CART_ERRORS.VERSION_CONFLICT);

        // Move the guest session into checkout (best-effort — never blocks lock).
        await this.sessions.markCheckoutPending(scope.sessionId).catch(() => {});
        await this.#cache(updated);
        await this.events.publish(new CartLockedEvent({ cartId, sessionId: scope.sessionId }));
        this.audit.success('cart.locked', { actorId, targetId: cartId });
        return toCartDTO(updated);
      },
      { ttlMs: this.cartConfig.lockTtlMs },
    );
  }

  /**
   * Called by the future Order Engine (via DI) once an Order is created from a
   * LOCKED cart. Marks the cart CONVERTED and records coupon redemption. Kept
   * here so the cart→order boundary stays one-directional.
   */
  async convertToOrder(cartId, orderId, options = {}) {
    const cart = await this.carts.findById(cartId);
    if (!cart) throw new NotFoundError(CART_ERRORS.CART_NOT_FOUND);
    if (cart.status === CART_STATUS.CONVERTED_TO_ORDER) throw new ConflictError(CART_ERRORS.ALREADY_CONVERTED);
    if (cart.status !== CART_STATUS.LOCKED && cart.status !== CART_STATUS.CHECKOUT_PENDING) {
      throw new ForbiddenError(CART_ERRORS.CART_NOT_EDITABLE);
    }
    const updated = await this.carts.updateById(cartId, {
      status: CART_STATUS.CONVERTED_TO_ORDER,
      convertedOrderId: orderId,
    });
    if (cart.coupon?.couponId) {
      await this.coupons.recordRedemption(cart.coupon.couponId, options).catch(() => {});
    }
    await this.cache.del(String(cartId));
    await this.events.publish(new CartConvertedEvent({ cartId: String(cartId), orderId: String(orderId) }));
    this.audit.success('cart.converted', { targetId: String(cartId), metadata: { orderId: String(orderId) } });
    return toCartDTO(updated);
  }

  /** Abandon the active cart (guest left / manual). */
  async abandonCart(scope, actorId = null) {
    const cart = await this.carts.findActiveBySession(scope);
    if (!cart) return { abandoned: false };
    const cartId = this.#cartId(cart);
    await this.carts.updateById(cartId, { status: CART_STATUS.ABANDONED, endedReason: 'guest_abandoned' });
    await this.cache.del(cartId);
    await this.events.publish(new CartAbandonedEvent({ cartId, sessionId: scope.sessionId }));
    this.audit.success('cart.abandoned', { actorId, targetId: cartId });
    return { abandoned: true, id: cartId };
  }

  /**
   * Link a registered customer to the session's active cart WITHOUT losing cart
   * history. Invoked by the `session.linked_account` event when a guest logs in.
   */
  async linkCustomerBySession(sessionId, customerUserId) {
    const cart = await this.carts.findActiveBySessionId(sessionId);
    if (!cart) return null;
    const updated = await this.carts.updateById(this.#cartId(cart), { customerUserId });
    await this.#cache(updated);
    this.audit.success('cart.customer_linked', { targetId: this.#cartId(cart), actorId: String(customerUserId) });
    return toCartDTO(updated);
  }

  /** Abandon the session's active cart (invoked when the guest session ends). */
  async abandonBySession(sessionId, reason = 'session_ended') {
    const cart = await this.carts.findActiveBySessionId(sessionId);
    if (!cart) return { abandoned: false };
    const cartId = this.#cartId(cart);
    await this.carts.updateById(cartId, { status: CART_STATUS.ABANDONED, endedReason: reason });
    await this.cache.del(cartId);
    await this.events.publish(new CartAbandonedEvent({ cartId, sessionId }));
    return { abandoned: true, id: cartId };
  }

  /** Sweep expired carts (run by a scheduled job) → CartExpired + free cache. */
  async expireStaleCarts(limit = 100) {
    const stale = await this.carts.findStaleForExpiry(this.#now(), limit);
    for (const cart of stale) {
      const cartId = this.#cartId(cart);
      await this.carts.updateById(cartId, { status: CART_STATUS.EXPIRED, endedReason: 'inactivity_timeout' });
      await this.cache.del(cartId);
      await this.events.publish(new CartExpiredEvent({ cartId, sessionId: cart.sessionId }));
    }
    return { expired: stale.length };
  }

  // --- helpers ---

  #assertEditable(cart) {
    if (EDITABLE_CART_STATUSES.includes(cart.status)) return;
    if (LIVE_CART_STATUSES.includes(cart.status)) throw new ForbiddenError(CART_ERRORS.CART_LOCKED);
    throw new ForbiddenError(CART_ERRORS.CART_NOT_EDITABLE);
  }

  #couponSnapshot(coupon) {
    if (!coupon) return null;
    return {
      type: coupon.type,
      value: coupon.value,
      currency: coupon.currency ?? 'INR',
      minSubtotal: coupon.minSubtotal ?? null,
      maxDiscount: coupon.maxDiscount ?? null,
      targetProductId: coupon.targetProductId ? String(coupon.targetProductId) : null,
      buyQuantity: coupon.buyQuantity ?? null,
      getQuantity: coupon.getQuantity ?? null,
      status: coupon.status,
      validFrom: coupon.validFrom ?? null,
      validUntil: coupon.validUntil ?? null,
      usageLimit: coupon.usageLimit ?? null,
      usageCount: coupon.usageCount ?? 0,
    };
  }

  /** Re-resolve an applied coupon LIVE (fresh validity/usage) for recompute. */
  async #resolveCouponSnapshot(scope, coupon) {
    if (!coupon?.code) return null;
    const live = await this.coupons.resolveForApply(
      { organizationId: scope.organizationId, restaurantId: scope.restaurantId },
      coupon.code,
    );
    return this.#couponSnapshot(live);
  }

  async #cache(cart) {
    try {
      await this.cache.save(this.#cartId(cart), toCartDTO(cart), this.cartConfig.expirationSeconds);
    } catch (err) {
      this.logger.warn({ err }, 'Cart cache write failed (continuing)');
    }
  }
}

export const cartService = new CartService();
export default cartService;
