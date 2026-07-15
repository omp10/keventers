import { BaseService } from '#core/service/base.service.js';
import { config } from '#config';
import { orderService } from '#modules/order/index.js';

import { LOYALTY_SOURCE } from '../constants/customer.constants.js';
import { customerRepository } from '../repositories/customer.repository.js';

import { computeEarnPoints, loyaltyService } from './loyalty.service.js';

/**
 * Customer analytics — EVENT-DRIVEN PROJECTIONS. Lifetime spend, order counts,
 * average order value, visit frequency, last visit and favorite products are
 * maintained by reacting to OrderCompleted / PaymentCaptured / RefundCompleted —
 * NEVER recomputed from raw orders on a profile read. It resolves the customer by
 * (restaurant, userId); if none exists yet (guest not linked) it no-ops — the
 * merge-time `recomputeForCustomer` backfill is the catch-all. It does NOT call
 * the order/payment services for state; it only consumes their events (plus a
 * trusted read seam for the one-time merge rebuild). Loyalty earning/clawback is
 * delegated to the loyalty engine (idempotent by payment/refund id).
 */
export class CustomerAnalyticsService extends BaseService {
  constructor({
    customers = customerRepository,
    loyalty = loyaltyService,
    orders = orderService,
    earnRate = config.customer.loyalty.earnPointsPerCurrencyUnit,
    favoritesLimit = config.customer.limits.favoriteProducts,
    eventBus,
  } = {}) {
    super({ name: 'customer.analytics', eventBus });
    this.customers = customers;
    this.loyalty = loyalty;
    this.orders = orders;
    this.earnRate = earnRate;
    this.favoritesLimit = favoritesLimit;
  }

  #scopeOf(order) {
    return { organizationId: String(order.organizationId), restaurantId: String(order.restaurantId) };
  }

  async #resolveCustomer(order) {
    if (!order?.customerUserId) return null;
    const scope = this.#scopeOf(order);
    const customer = await this.customers.findByUser(scope, order.customerUserId);
    return customer ? { scope, customer, customerId: customer.id ?? String(customer._id) } : null;
  }

  #avg(spend, completed) {
    return completed > 0 ? Math.floor(spend / completed) : 0;
  }

  // ==================== EVENT PROJECTIONS ====================

  /** OrderCompleted → order/visit counters + favorites + last visit. */
  async onOrderCompleted(order) {
    const resolved = await this.#resolveCustomer(order);
    if (!resolved) return { skipped: true };
    const { customerId, customer } = resolved;
    const set = { lastVisitAt: new Date() };
    if (!customer.stats?.firstOrderAt) set.firstOrderAt = order.completedAt ?? order.createdAt ?? new Date();
    const updated = await this.customers.incStats(customerId, { totalOrders: 1, completedOrders: 1, visitCount: 1 }, set);
    await this.customers.bumpFavoriteProducts(
      customerId,
      (order.items ?? []).map((it) => ({ productId: it.productId, name: it.product?.name ?? it.name ?? null, quantity: it.quantity ?? 1 })),
      this.favoritesLimit,
    );
    await this.customers.incStats(customerId, {}, { avgOrderValue: this.#avg(updated.stats?.lifetimeSpend ?? 0, updated.stats?.completedOrders ?? 0) });
    return { customerId, updated: true };
  }

  /** OrderCancelled → cancelled counter (best-effort). */
  async onOrderCancelled(order) {
    const resolved = await this.#resolveCustomer(order);
    if (!resolved) return { skipped: true };
    await this.customers.incStats(resolved.customerId, { cancelledOrders: 1 });
    return { customerId: resolved.customerId, updated: true };
  }

  /**
   * PaymentCaptured → lifetime spend + loyalty earn. Spend is incremented once
   * per payment (the Payment Engine publishes PaymentCaptured exactly once per
   * payment — its settle is idempotent). Loyalty earn is independently idempotent
   * by paymentId.
   */
  async onPaymentCaptured({ order, amount, paymentId }) {
    const resolved = await this.#resolveCustomer(order);
    if (!resolved) return { skipped: true };
    const { scope, customerId } = resolved;
    const updated = await this.customers.incStats(customerId, { lifetimeSpend: amount });
    await this.customers.incStats(customerId, {}, { avgOrderValue: this.#avg(updated.stats?.lifetimeSpend ?? 0, updated.stats?.completedOrders ?? 0) });

    const points = computeEarnPoints(amount, this.earnRate);
    if (points > 0) {
      await this.loyalty
        .earn({ scope, customerId, userId: order.customerUserId, points, source: { type: LOYALTY_SOURCE.PAYMENT, id: String(paymentId) }, orderId: order.id ?? order._id, reason: 'order_payment' })
        .catch((err) => this.logger.warn({ err }, 'loyalty earn failed (continuing)'));
    }
    return { customerId, spendAdded: amount, points };
  }

  /**
   * RefundCompleted → reduce lifetime spend + claw back proportional points.
   * Idempotent (RefundCompleted fires once per refund; loyalty reversal keyed by
   * refundId).
   */
  async onRefundCompleted({ order, amount, refundId }) {
    const resolved = await this.#resolveCustomer(order);
    if (!resolved) return { skipped: true };
    const { scope, customer, customerId } = resolved;
    const newSpend = Math.max(0, (customer.stats?.lifetimeSpend ?? 0) - amount);
    const updated = await this.customers.incStats(customerId, { totalRefunded: amount }, { lifetimeSpend: newSpend });
    await this.customers.incStats(customerId, {}, { avgOrderValue: this.#avg(newSpend, updated.stats?.completedOrders ?? 0) });

    const points = computeEarnPoints(amount, this.earnRate);
    await this.loyalty
      .reverse({ scope, customerId, userId: order.customerUserId, points, source: { type: LOYALTY_SOURCE.REFUND, id: String(refundId) }, reason: 'order_refund' })
      .catch((err) => this.logger.warn({ err }, 'loyalty reverse failed (continuing)'));
    return { customerId, refunded: amount, pointsReversed: points };
  }

  // ==================== MERGE-TIME REBUILD ====================

  /**
   * Re-project a customer's stats from their authoritative order history (called
   * ONCE on a guest→customer merge — not per request). Idempotent: it SETs the
   * whole projection from source, so re-running is safe and never double-counts.
   */
  async recomputeForCustomer(scope, customer) {
    const customerId = customer.id ?? String(customer._id);
    const userId = customer.userId;
    const all = await this.orders.listForCustomerSystem(scope.restaurantId, userId, { limit: 5000 });
    const stats = {
      totalOrders: all.length,
      completedOrders: 0,
      cancelledOrders: 0,
      lifetimeSpend: 0,
      totalRefunded: 0,
      avgOrderValue: 0,
      visitCount: 0,
      lastVisitAt: null,
      firstOrderAt: null,
      favoriteProducts: [],
    };
    const favMap = new Map();
    for (const o of all) {
      const at = o.completedAt ?? o.createdAt ?? null;
      if (at && (!stats.firstOrderAt || at < stats.firstOrderAt)) stats.firstOrderAt = at;
      if (at && (!stats.lastVisitAt || at > stats.lastVisitAt)) stats.lastVisitAt = at;
      if (o.status === 'completed') {
        stats.completedOrders += 1;
        stats.visitCount += 1;
        if (o.payment?.status === 'captured' || o.paymentStatus === 'captured') stats.lifetimeSpend += o.pricing?.total?.amount ?? 0;
        for (const it of o.items ?? []) {
          if (!it.productId) continue;
          const key = String(it.productId);
          const cur = favMap.get(key) ?? { productId: it.productId, name: it.product?.name ?? it.name ?? null, orderedCount: 0 };
          cur.orderedCount += it.quantity ?? 1;
          favMap.set(key, cur);
        }
      } else if (o.status === 'cancelled') {
        stats.cancelledOrders += 1;
      }
    }
    stats.avgOrderValue = this.#avg(stats.lifetimeSpend, stats.completedOrders);
    stats.favoriteProducts = [...favMap.values()].sort((a, b) => b.orderedCount - a.orderedCount).slice(0, this.favoritesLimit);
    await this.customers.setStats(customerId, stats);
    return stats;
  }
}

export const customerAnalyticsService = new CustomerAnalyticsService();
export default customerAnalyticsService;
