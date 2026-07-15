import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '#core/errors/app-error.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { config } from '#config';

import {
  CUSTOMER_ERRORS,
  LOYALTY_SOURCE,
  REDEMPTION_STATUS,
  REDIS_KEYS,
  REWARD_STATUS,
  REWARD_TYPE,
  TIMELINE_EVENT,
} from '../constants/customer.constants.js';
import { toRedemptionDTO, toRewardDTO } from '../dto/customer.dto.js';
import { RewardRedeemedEvent } from '../events/customer.events.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { rewardRepository } from '../repositories/reward.repository.js';
import { rewardRedemptionRepository } from '../repositories/reward-redemption.repository.js';
import { customerRedisStore } from '../stores/customer-redis.store.js';
import { entityId } from '../utils/id.util.js';
import { redemptionCode } from '../utils/reference.util.js';
import { tierRank } from '../utils/tier.util.js';
import { loadForStaff, resolveRestaurantScope } from '../utils/tenant.util.js';

import { customerService } from './customer.service.js';
import { loyaltyService } from './loyalty.service.js';

/**
 * Reward service. Owns the restaurant reward CATALOG (staff/admin CRUD) and the
 * customer REDEMPTION flow. Redemption debits points via the loyalty engine
 * (idempotent) and issues an immutable, Pricing-Engine-ready `outcome` artifact
 * (discount bps / fixed amount / free product / cashback) that the Cart/Pricing
 * Engine can later apply — this module NEVER computes an order price.
 */
export class RewardService extends BaseService {
  constructor({
    rewards = rewardRepository,
    redemptions = rewardRedemptionRepository,
    customers = customerRepository,
    customerSvc = customerService,
    loyalty = loyaltyService,
    store = customerRedisStore,
    lock = distributedLock,
    resolveScope = resolveRestaurantScope,
    eventBus,
  } = {}) {
    super({ name: 'customer.reward', eventBus });
    this.rewards = rewards;
    this.redemptions = redemptions;
    this.customers = customers;
    this.customerSvc = customerSvc;
    this.loyalty = loyalty;
    this.store = store;
    this.lock = lock;
    this.resolveScope = resolveScope;
  }

  // ==================== CATALOG (staff / admin) ====================

  async createReward(tenant, restaurantId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const reward = await this.rewards.createScoped(scope, { ...this.#rewardFields(data) });
    await this.store.invalidateRewards(scope.restaurantId);
    this.audit.success('customer.reward.created', { actorId, targetId: entityId(reward), metadata: { type: data.type } });
    return toRewardDTO(reward);
  }

  async listRewards(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const page = await this.rewards.paginateForStaff(scope, {
      filter: { ...(query.status ? { status: query.status } : {}), ...(query.type ? { type: query.type } : {}) },
      search: query.search,
      sort: query.sort ?? 'sortOrder',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toRewardDTO);
  }

  async updateReward(tenant, id, data, actorId = null) {
    const reward = await loadForStaff(this.rewards, tenant, id, CUSTOMER_ERRORS.REWARD_NOT_FOUND);
    const updated = await this.rewards.updateById(entityId(reward), this.#rewardFields(data, { partial: true }));
    await this.store.invalidateRewards(String(reward.restaurantId));
    this.audit.success('customer.reward.updated', { actorId, targetId: entityId(reward) });
    return toRewardDTO(updated);
  }

  async deleteReward(tenant, id, actorId = null) {
    const reward = await loadForStaff(this.rewards, tenant, id, CUSTOMER_ERRORS.REWARD_NOT_FOUND);
    await this.rewards.softDeleteById(entityId(reward));
    await this.store.invalidateRewards(String(reward.restaurantId));
    this.audit.success('customer.reward.deleted', { actorId, targetId: entityId(reward) });
    return { id: entityId(reward), deleted: true };
  }

  #rewardFields(data, { partial = false } = {}) {
    const out = {};
    const scalars = ['name', 'description', 'type', 'pointsCost', 'status', 'availableFrom', 'availableUntil', 'minTier', 'redemptionValidityDays', 'perCustomerLimit', 'totalStock', 'imageUrl', 'sortOrder'];
    for (const f of scalars) if (!partial || data[f] !== undefined) out[f] = data[f];
    if (!partial || data.value !== undefined) out.value = data.value ?? {};
    return out;
  }

  // ==================== CUSTOMER-FACING ====================

  /** Active, tier-eligible rewards for the customer's restaurant (cached). */
  async listActiveForCustomer(customerScope) {
    const restaurantId = customerScope.restaurantId;
    const cached = await this.store.getRewards(restaurantId);
    if (cached) return cached;
    const rewards = await this.rewards.findActiveForRestaurant({ organizationId: customerScope.organizationId, restaurantId });
    const dtos = rewards.map(toRewardDTO);
    await this.store.setRewards(restaurantId, dtos, config.customer.cache.rewardsTtlSeconds);
    return dtos;
  }

  /**
   * Redeem a reward: validate availability + affordability, debit points via the
   * loyalty engine (idempotent), and issue the pricing-ready redemption artifact.
   */
  async redeem(customerScope, rewardId, { idempotencyKey = null } = {}) {
    const scope = { organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId };
    const { customerId } = await this.customerSvc.ensureCustomer(scope, customerScope.userId);
    const userId = customerScope.userId;

    const reward = await this.rewards.findByIdScoped(scope, rewardId);
    if (!reward || reward.deletedAt) throw new NotFoundError(CUSTOMER_ERRORS.REWARD_NOT_FOUND);
    this.#assertRedeemable(reward);

    return this.lock.withLock(`${REDIS_KEYS.REDEEM_IDEM}:${customerId}:${rewardId}`, async () => {
      // Per-customer redemption cap.
      if (reward.perCustomerLimit != null) {
        const used = await this.redemptions.countForCustomerReward(customerId, entityId(reward));
        if (used >= reward.perCustomerLimit) throw new ConflictError(CUSTOMER_ERRORS.REWARD_INACTIVE);
      }
      // Finite stock.
      if (reward.totalStock != null && reward.totalStock <= 0) throw new ConflictError(CUSTOMER_ERRORS.REWARD_INACTIVE);

      const code = redemptionCode();
      // Debit points (idempotent by the provided key, else by the fresh code).
      const debit = await this.loyalty.redeem({
        scope, customerId, userId,
        points: reward.pointsCost,
        source: { type: LOYALTY_SOURCE.REWARD, id: idempotencyKey ?? code },
        rewardId: entityId(reward),
        reason: `reward:${reward.name}`,
      });

      const validityDays = reward.redemptionValidityDays;
      const redemption = await this.#issueRedemption(scope, {
        customerId, userId, reward, code, ledgerId: debit.ledgerId,
        expiresAt: validityDays ? new Date(Date.now() + validityDays * 86400000) : null,
      });
      if (reward.totalStock != null) await this.rewards.decrementStock(entityId(reward)).catch(() => {});

      await this.customers.pushTimeline(customerId, { at: new Date(), event: TIMELINE_EVENT.REWARD_REDEEMED, detail: { rewardId: entityId(reward), pointsSpent: reward.pointsCost } }, config.customer.limits.timeline);
      await this.store.invalidateProfile(customerId);
      await this.events.publish(new RewardRedeemedEvent({ customerId: String(customerId), userId: String(userId), rewardId: entityId(reward), rewardType: reward.type, pointsSpent: reward.pointsCost, code, restaurantId: scope.restaurantId }));
      this.audit.success('customer.reward.redeemed', { targetId: entityId(redemption), actorId: userId, metadata: { rewardId: entityId(reward), points: reward.pointsCost } });
      return toRedemptionDTO(redemption);
    }, { ttlMs: config.customer.loyalty.lockTtlMs });
  }

  async listRedemptionsForCustomer(customerScope) {
    const scope = { organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId };
    const { customerId } = await this.customerSvc.ensureCustomer(scope, customerScope.userId);
    const rows = await this.redemptions.findForCustomer(customerId, { limit: 50 });
    return rows.map(toRedemptionDTO);
  }

  #assertRedeemable(reward) {
    if (reward.status !== REWARD_STATUS.ACTIVE) throw new BadRequestError(CUSTOMER_ERRORS.REWARD_INACTIVE);
    const now = Date.now();
    if (reward.availableFrom && new Date(reward.availableFrom).getTime() > now) throw new BadRequestError(CUSTOMER_ERRORS.REWARD_INACTIVE);
    if (reward.availableUntil && new Date(reward.availableUntil).getTime() < now) throw new BadRequestError(CUSTOMER_ERRORS.REWARD_INACTIVE);
  }

  /** Create the immutable redemption record; a unique-code clash is a replay. */
  async #issueRedemption(scope, { customerId, userId, reward, code, ledgerId, expiresAt }) {
    const outcome = this.#outcomeFor(reward);
    try {
      return await this.redemptions.createScoped(scope, {
        customerId, userId, rewardId: entityId(reward), code,
        rewardType: reward.type, pointsSpent: reward.pointsCost,
        outcome, status: REDEMPTION_STATUS.ISSUED, ledgerId, expiresAt,
      });
    } catch (err) {
      if (err?.code === 11000) {
        const existing = await this.redemptions.findByCode(code);
        if (existing) return existing;
      }
      throw err;
    }
  }

  /** Snapshot the reward's value into a pricing-ready outcome. */
  #outcomeFor(reward) {
    const v = reward.value ?? {};
    const base = { currency: v.currency ?? 'INR', minOrderAmount: v.minOrderAmount ?? 0 };
    switch (reward.type) {
      case REWARD_TYPE.DISCOUNT:
      case REWARD_TYPE.COUPON:
        return { ...base, discountBps: v.discountBps ?? null, discountAmount: v.discountAmount ?? 0, maxDiscountAmount: v.maxDiscountAmount ?? 0 };
      case REWARD_TYPE.FREE_PRODUCT:
        return { ...base, freeProductId: v.freeProductId ?? null };
      case REWARD_TYPE.CASHBACK:
        return { ...base, cashbackAmount: v.cashbackAmount ?? 0 };
      default:
        return base;
    }
  }

  // Tier gating helper (validated in flows where the account tier is known).
  static meetsTier(rewardMinTier, customerTier) {
    if (!rewardMinTier) return true;
    return tierRank(customerTier) >= tierRank(rewardMinTier);
  }
}

export const rewardService = new RewardService();
export default rewardService;
