import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ConflictError } from '#core/errors/app-error.js';

import { COUPON_AUDIENCE, COUPON_STATUS, PRICING_ERRORS } from '../constants/pricing.constants.js';
import { toCouponDTO } from '../dto/pricing.dto.js';
import {
  CouponCreatedEvent,
  CouponDeletedEvent,
  CouponRedeemedEvent,
  CouponUpdatedEvent,
} from '../events/pricing.events.js';
import { couponRepository } from '../repositories/coupon.repository.js';
import { loadOwned, resolveScope } from '../utils/tenant.util.js';

/**
 * Coupon management + resolution. Restaurant managers create/manage coupons;
 * the Cart/Pricing flow resolves a coupon by code (scoped) into a snapshot the
 * Pricing Engine evaluates. Coupon VALIDATION is done by the engine's
 * CouponEvaluator, not here — this service only owns persistence + scoping.
 */
export class CouponService extends BaseService {
  constructor({ coupons = couponRepository, resolveScope: scopeResolver, eventBus } = {}) {
    super({ name: 'pricing.coupon', eventBus });
    this.coupons = coupons;
    this.resolveScope = scopeResolver ?? resolveScope;
  }

  async createCoupon(tenant, restaurantId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const code = String(data.code).toUpperCase();
    if (await this.coupons.existsByCode(scope, code)) {
      throw new ConflictError(PRICING_ERRORS.DUPLICATE_COUPON);
    }
    const coupon = await this.coupons.create({
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      code,
      description: data.description ?? '',
      type: data.type,
      value: data.value ?? 0,
      currency: data.currency ?? 'INR',
      minSubtotal: data.minSubtotal ?? null,
      maxDiscount: data.maxDiscount ?? null,
      targetProductId: data.targetProductId ?? null,
      buyQuantity: data.buyQuantity ?? null,
      getQuantity: data.getQuantity ?? null,
      status: data.status ?? COUPON_STATUS.ACTIVE,
      validFrom: data.validFrom ?? null,
      validUntil: data.validUntil ?? null,
      usageLimit: data.usageLimit ?? null,
      audience: data.audience ?? 'all',
      perCustomerLimit: data.perCustomerLimit ?? null,
    });
    await this.events.publish(
      new CouponCreatedEvent({ restaurantId: scope.restaurantId, couponId: coupon.id ?? String(coupon._id), code }),
    );
    this.audit.success('pricing.coupon.created', { actorId, targetId: coupon.id ?? String(coupon._id) });
    return toCouponDTO(coupon);
  }

  async listCoupons(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    if (query.status) filter.status = query.status;
    const page = await this.coupons.paginateScoped(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'type'],
    });
    return this.paginated(page, toCouponDTO);
  }

  async getCoupon(tenant, id) {
    const coupon = await loadOwned(this.coupons, tenant, id, PRICING_ERRORS.COUPON_NOT_FOUND);
    return toCouponDTO(coupon);
  }

  async updateCoupon(tenant, id, data, actorId = null) {
    const coupon = await loadOwned(this.coupons, tenant, id, PRICING_ERRORS.COUPON_NOT_FOUND);
    const patch = {};
    for (const key of [
      'description', 'type', 'value', 'currency', 'minSubtotal', 'maxDiscount',
      'targetProductId', 'buyQuantity', 'getQuantity', 'status', 'validFrom', 'validUntil', 'usageLimit',
      'audience', 'perCustomerLimit',
    ]) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    const updated = await this.coupons.updateById(id, patch);
    await this.events.publish(
      new CouponUpdatedEvent({ restaurantId: String(coupon.restaurantId), couponId: id, changes: Object.keys(patch) }),
    );
    this.audit.success('pricing.coupon.updated', { actorId, targetId: id });
    return toCouponDTO(updated);
  }

  async deleteCoupon(tenant, id, actorId = null) {
    const coupon = await loadOwned(this.coupons, tenant, id, PRICING_ERRORS.COUPON_NOT_FOUND);
    await this.coupons.softDeleteById(id);
    await this.events.publish(
      new CouponDeletedEvent({ restaurantId: String(coupon.restaurantId), couponId: id }),
    );
    this.audit.success('pricing.coupon.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }

  /**
   * Resolve a coupon by code within a TRUSTED scope (org+restaurant) for the
   * Cart flow — returns the raw coupon snapshot (or null) for the Pricing Engine
   * to evaluate. No staff tenant required (the cart is bound to its restaurant).
   */
  async resolveForApply(scope, code) {
    if (!code) return null;
    return this.coupons.findByCode(scope, code);
  }

  /**
   * Customer-targeting gate (audience + per-customer cap). Kept OUT of the pure
   * pricing evaluator on purpose: it needs the customer's order history, which
   * is scope the engine deliberately doesn't have. Called at apply time, where
   * the cart's guest scope carries the signed-in customer. Throws a friendly
   * error when the customer isn't eligible; resolves silently otherwise.
   *
   * When we can't identify a customer (no account on the session) there is
   * nothing to check against, so we allow it — login is mandatory, so this is
   * the rare edge, not the norm.
   */
  async assertCustomerEligible(coupon, scope = {}) {
    const needsAudience = coupon.audience === COUPON_AUDIENCE.NEW_CUSTOMERS;
    const needsPerCustomer = coupon.perCustomerLimit != null;
    if (!needsAudience && !needsPerCustomer) return;

    const customerUserId = scope.customerUserId;
    if (!customerUserId) return;

    const { orderService } = await import('#modules/order/index.js');
    const stats = await orderService.getCustomerCouponStats(
      customerUserId,
      coupon.restaurantId ?? scope.restaurantId,
      coupon.code,
    );
    if (needsAudience && stats.orderCount > 0) throw new BadRequestError(PRICING_ERRORS.NOT_NEW_CUSTOMER);
    if (needsPerCustomer && stats.couponUses >= coupon.perCustomerLimit) {
      throw new BadRequestError(PRICING_ERRORS.PER_CUSTOMER_LIMIT);
    }
  }

  /** Record a redemption (called when a coupon-bearing cart converts to order). */
  async recordRedemption(couponId, options = {}) {
    await this.coupons.incrementUsage(couponId, options);
    await this.events.publish(new CouponRedeemedEvent({ couponId: String(couponId) }));
  }
}

export const couponService = new CouponService();
export default couponService;
