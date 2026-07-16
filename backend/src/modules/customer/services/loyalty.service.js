import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ConflictError } from '#core/errors/app-error.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { config } from '#config';

import {
  CUSTOMER_ERRORS,
  LOYALTY_SOURCE,
  LOYALTY_TXN_TYPE,
  REDIS_KEYS,
  TIMELINE_EVENT,
} from '../constants/customer.constants.js';
import { toLedgerDTO, toLoyaltyDTO } from '../dto/customer.dto.js';
import {
  LoyaltyAdjustedEvent,
  LoyaltyExpiredEvent,
  LoyaltyPointsEarnedEvent,
  LoyaltyRedeemedEvent,
  TierChangedEvent,
} from '../events/customer.events.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { loyaltyAccountRepository } from '../repositories/loyalty-account.repository.js';
import { loyaltyLedgerRepository } from '../repositories/loyalty-ledger.repository.js';
import { customerRedisStore } from '../stores/customer-redis.store.js';
import { ledgerReference } from '../utils/reference.util.js';
import { resolveTier } from '../utils/tier.util.js';

/** Pure: loyalty points earned for a captured spend (integer minor units → points). */
export function computeEarnPoints(amountMinor, ratePerMajorUnit) {
  const major = Math.trunc(amountMinor) / 100; // minor → major currency unit
  return Math.floor(major * ratePerMajorUnit);
}

/**
 * Loyalty engine. The IMMUTABLE ledger is the source of truth: every earn,
 * redeem, adjustment, expiration and bonus APPENDS an entry, and the account
 * projection (balance/lifetime/tier) is kept in step atomically under a
 * per-customer lock. The displayed balance is always derived from the ledger
 * (and can be rebuilt from it). Idempotency is guaranteed by the unique
 * (customer, source) ledger index — a replayed PaymentCaptured never double-earns.
 */
export class LoyaltyService extends BaseService {
  constructor({
    accounts = loyaltyAccountRepository,
    ledger = loyaltyLedgerRepository,
    customers = customerRepository,
    store = customerRedisStore,
    lock = distributedLock,
    loyaltyConfig = config.customer.loyalty,
    eventBus,
  } = {}) {
    super({ name: 'customer.loyalty', eventBus });
    this.accounts = accounts;
    this.ledger = ledger;
    this.customers = customers;
    this.store = store;
    this.lock = lock;
    this.cfg = loyaltyConfig;
  }

  #lockKey(customerId) {
    return `${REDIS_KEYS.LOYALTY_LOCK}:${customerId}`;
  }

  /** Ensure the customer's loyalty account exists (idempotent). */
  ensureAccount(scope, customerId, userId) {
    return this.accounts.ensureForCustomer(scope, customerId, userId);
  }

  // ==================== CREDIT (earn / bonus) ====================

  /** Award points from spend. Idempotent by source. */
  earn(ctx) {
    return this.#credit(LOYALTY_TXN_TYPE.EARN, ctx);
  }

  /** Award bonus points (signup / campaign / referral). Idempotent by source. */
  grantBonus(ctx) {
    return this.#credit(LOYALTY_TXN_TYPE.BONUS, ctx);
  }

  async #credit(type, { scope, customerId, userId, points, source, orderId = null, rewardId = null, campaignId = null, reason = null, expiresInDays } = {}) {
    const pts = Math.trunc(points);
    if (!Number.isFinite(pts) || pts <= 0) throw new BadRequestError(CUSTOMER_ERRORS.INVALID_ADJUSTMENT);

    return this.lock.withLock(this.#lockKey(customerId), async () => {
      // Idempotency: a ledger entry for this source already exists.
      if (source?.id) {
        const prior = await this.ledger.findBySource(customerId, source.type, String(source.id));
        if (prior) return { ledger: toLedgerDTO(prior), created: false, balance: null };
      }
      const account = await this.ensureAccount(scope, customerId, userId);
      const days = expiresInDays ?? this.cfg.pointsExpiryDays;
      const expiresAt = days ? new Date(Date.now() + days * 86400000) : null;

      const entry = await this.#appendLedger(scope, {
        customerId, userId, type,
        points: pts,
        balanceAfter: (account.balance ?? 0) + pts,
        source, orderId, rewardId, campaignId, reason, expiresAt,
      });
      if (entry.replayed) return { ledger: toLedgerDTO(entry.doc), created: false, balance: null };

      const updated = await this.accounts.applyDelta(customerId, { balance: pts, lifetimePoints: pts }, { lastEarnedAt: new Date() });
      await this.#evaluateTier(scope, customerId, updated);
      await this.customers.pushTimeline(customerId, { at: new Date(), event: TIMELINE_EVENT.LOYALTY_EARNED, detail: { points: pts, type, orderId } }, config.customer.limits.timeline);
      await this.store.invalidateLoyalty(customerId);
      await this.store.invalidateProfile(customerId);

      await this.events.publish(new LoyaltyPointsEarnedEvent({ customerId: String(customerId), userId: String(userId), points: pts, type, balance: updated.balance, restaurantId: scope.restaurantId, orderId: orderId ? String(orderId) : null }));
      this.audit.success('customer.loyalty.earned', { targetId: String(customerId), metadata: { points: pts, type, source: source?.type } });
      return { ledger: toLedgerDTO(entry.doc), created: true, balance: updated.balance };
    }, { ttlMs: this.cfg.lockTtlMs });
  }

  /**
   * Clawback (points reversal) — e.g. when an earning order is refunded. Posts a
   * REVERSAL entry, capped at the current balance so it never goes negative.
   * Idempotent by source; does NOT reduce lifetime points (tier is preserved).
   */
  async reverse({ scope, customerId, userId, points, source, reason = null } = {}) {
    const pts = Math.trunc(points);
    if (!Number.isFinite(pts) || pts <= 0) return { reversed: 0 };
    return this.lock.withLock(this.#lockKey(customerId), async () => {
      if (source?.id) {
        const prior = await this.ledger.findBySource(customerId, source.type, String(source.id));
        if (prior) return { reversed: Math.abs(prior.points), replayed: true };
      }
      const account = await this.ensureAccount(scope, customerId, userId);
      const reverse = Math.max(0, Math.min(pts, account.balance ?? 0));
      const entry = await this.#appendLedger(scope, {
        customerId, userId, type: LOYALTY_TXN_TYPE.REVERSAL,
        points: -reverse, balanceAfter: (account.balance ?? 0) - reverse,
        source, reason,
      });
      if (entry.replayed) return { reversed: reverse, replayed: true };
      if (reverse > 0) {
        await this.accounts.applyDelta(customerId, { balance: -reverse });
        await this.store.invalidateLoyalty(customerId);
      }
      this.audit.success('customer.loyalty.reversed', { targetId: String(customerId), metadata: { points: reverse, source: source?.type } });
      return { reversed: reverse };
    }, { ttlMs: this.cfg.lockTtlMs });
  }

  // ==================== DEBIT (redeem) ====================

  /** Spend points (reward redemption). Idempotent by source; never goes negative. */
  async redeem({ scope, customerId, userId, points, source, rewardId = null, reason = null } = {}) {
    const pts = Math.trunc(points);
    if (!Number.isFinite(pts) || pts <= 0) throw new BadRequestError(CUSTOMER_ERRORS.INVALID_ADJUSTMENT);

    return this.lock.withLock(this.#lockKey(customerId), async () => {
      if (source?.id) {
        const prior = await this.ledger.findBySource(customerId, source.type, String(source.id));
        if (prior) return { dto: toLedgerDTO(prior), ledgerId: prior.id ?? String(prior._id), balance: null, replayed: true };
      }
      const account = await this.ensureAccount(scope, customerId, userId);
      if ((account.balance ?? 0) < pts) throw new ConflictError(CUSTOMER_ERRORS.INSUFFICIENT_POINTS);

      const entry = await this.#appendLedger(scope, {
        customerId, userId, type: LOYALTY_TXN_TYPE.REDEEM,
        points: -pts,
        balanceAfter: (account.balance ?? 0) - pts,
        source, rewardId, reason,
      });
      if (entry.replayed) return { dto: toLedgerDTO(entry.doc), ledgerId: entry.doc.id ?? String(entry.doc._id), balance: null, replayed: true };

      const updated = await this.accounts.applyDelta(customerId, { balance: -pts, redeemedPoints: pts }, { lastRedeemedAt: new Date() });
      await this.customers.pushTimeline(customerId, { at: new Date(), event: TIMELINE_EVENT.LOYALTY_REDEEMED, detail: { points: pts, rewardId } }, config.customer.limits.timeline);
      await this.store.invalidateLoyalty(customerId);
      await this.store.invalidateProfile(customerId);

      await this.events.publish(new LoyaltyRedeemedEvent({ customerId: String(customerId), userId: String(userId), points: pts, balance: updated.balance, restaurantId: scope.restaurantId, rewardId: rewardId ? String(rewardId) : null }));
      this.audit.success('customer.loyalty.redeemed', { targetId: String(customerId), metadata: { points: pts, rewardId } });
      return { dto: toLedgerDTO(entry.doc), ledgerId: entry.doc.id ?? String(entry.doc._id), balance: updated.balance, replayed: false };
    }, { ttlMs: this.cfg.lockTtlMs });
  }

  // ==================== MANUAL ADJUSTMENT ====================

  /** Staff/admin signed correction (±). Audited. Never drives the balance negative. */
  async adjust({ scope, customerId, userId, points, reason, actorId = null } = {}) {
    const pts = Math.trunc(points);
    if (!Number.isFinite(pts) || pts === 0) throw new BadRequestError(CUSTOMER_ERRORS.INVALID_ADJUSTMENT);

    return this.lock.withLock(this.#lockKey(customerId), async () => {
      const account = await this.ensureAccount(scope, customerId, userId);
      const balanceAfter = (account.balance ?? 0) + pts;
      if (balanceAfter < 0) throw new ConflictError(CUSTOMER_ERRORS.INSUFFICIENT_POINTS);

      const entry = await this.#appendLedger(scope, {
        customerId, userId, type: LOYALTY_TXN_TYPE.ADJUST,
        points: pts, balanceAfter,
        source: { type: LOYALTY_SOURCE.MANUAL, id: null }, reason, actorId,
      });
      // Positive corrections count toward lifetime (tier); negative do not raise it.
      const lifetimeDelta = pts > 0 ? pts : 0;
      const updated = await this.accounts.applyDelta(customerId, { balance: pts, lifetimePoints: lifetimeDelta });
      await this.#evaluateTier(scope, customerId, updated);
      await this.customers.pushTimeline(customerId, { at: new Date(), event: TIMELINE_EVENT.LOYALTY_ADJUSTED, detail: { points: pts, reason } }, config.customer.limits.timeline);
      await this.store.invalidateLoyalty(customerId);

      await this.events.publish(new LoyaltyAdjustedEvent({ customerId: String(customerId), points: pts, balance: updated.balance, restaurantId: scope.restaurantId, actorId: actorId ? String(actorId) : null }));
      this.audit.success('customer.loyalty.adjusted', { actorId, targetId: String(customerId), metadata: { points: pts, reason } });
      return toLedgerDTO(entry.doc);
    }, { ttlMs: this.cfg.lockTtlMs });
  }

  // ==================== EXPIRATION SWEEP ====================

  /**
   * Expire aged earn/bonus lots. Each lot is processed exactly once (idempotent
   * via source id = lot id) and expiration is capped at the current balance so it
   * never goes negative — a balance-capped, lot-marked, FIFO-approximate policy.
   */
  async expireDue(limit = 500, now = new Date()) {
    const lots = await this.ledger.findExpiryCandidates(now, limit);
    let expiredLots = 0;
    let expiredPoints = 0;
    for (const lot of lots) {
      const lotId = lot.id ?? String(lot._id);
      const already = await this.ledger.findBySource(lot.customerId, LOYALTY_SOURCE.EXPIRATION, lotId);
      if (already) continue;
      const scope = { organizationId: String(lot.organizationId), restaurantId: String(lot.restaurantId) };
      await this.lock.withLock(this.#lockKey(String(lot.customerId)), async () => {
        const account = await this.accounts.findByCustomer(lot.customerId);
        const balance = account?.balance ?? 0;
        const expire = Math.max(0, Math.min(lot.points, balance));
        const entry = await this.#appendLedger(scope, {
          customerId: lot.customerId, userId: lot.userId, type: LOYALTY_TXN_TYPE.EXPIRE,
          points: -expire, balanceAfter: balance - expire,
          source: { type: LOYALTY_SOURCE.EXPIRATION, id: lotId }, expiredFrom: lotId,
          reason: 'points_expired',
        });
        if (entry.replayed) return;
        if (expire > 0) {
          const updated = await this.accounts.applyDelta(lot.customerId, { balance: -expire, expiredPoints: expire });
          await this.customers.pushTimeline(lot.customerId, { at: new Date(), event: TIMELINE_EVENT.LOYALTY_EXPIRED, detail: { points: expire } }, config.customer.limits.timeline);
          await this.store.invalidateLoyalty(String(lot.customerId));
          await this.events.publish(new LoyaltyExpiredEvent({ customerId: String(lot.customerId), points: expire, balance: updated.balance, restaurantId: scope.restaurantId }));
        }
        expiredLots += 1;
        expiredPoints += expire;
      }, { ttlMs: this.cfg.lockTtlMs });
    }
    if (expiredLots) this.logger.info({ expiredLots, expiredPoints }, 'loyalty expiration sweep complete');
    return { expiredLots, expiredPoints };
  }

  // ==================== READS ====================

  async getAccountForCustomer(scope, customerId, userId) {
    const cached = await this.store.getLoyalty(String(customerId));
    if (cached) return cached;
    const account = await this.ensureAccount(scope, customerId, userId);
    const dto = toLoyaltyDTO(account);
    await this.store.setLoyalty(String(customerId), dto, config.customer.cache.loyaltyTtlSeconds);
    return dto;
  }

  async getLedgerForCustomer(customerId, query = {}) {
    const page = await this.ledger.paginateForCustomer(customerId, {
      filter: query.type ? { type: query.type } : {},
      sort: '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toLedgerDTO);
  }

  /** Rebuild the cached account aggregates from the immutable ledger (reconciliation). */
  async rebuild(scope, customerId, userId) {
    return this.lock.withLock(this.#lockKey(customerId), async () => {
      await this.ensureAccount(scope, customerId, userId);
      const snap = await this.ledger.computeSnapshot(customerId);
      const account = await this.accounts.rebuild(customerId, snap);
      await this.#evaluateTier(scope, customerId, account);
      await this.store.invalidateLoyalty(String(customerId));
      return toLoyaltyDTO(account);
    }, { ttlMs: this.cfg.lockTtlMs });
  }

  // ==================== INTERNALS ====================

  /** Append one immutable ledger entry; treat a unique-index clash as a replay. */
  async #appendLedger(scope, data) {
    try {
      const doc = await this.ledger.createScoped(scope, { reference: ledgerReference(), ...data });
      return { doc, replayed: false };
    } catch (err) {
      if (err?.code === 11000 && data.source?.id) {
        const existing = await this.ledger.findBySource(data.customerId, data.source.type, String(data.source.id));
        if (existing) return { doc: existing, replayed: true };
      }
      throw err;
    }
  }

  /** Recompute the tier from lifetime points; publish TierChanged on a change. */
  async #evaluateTier(scope, customerId, account) {
    const next = resolveTier(account.lifetimePoints ?? 0, this.cfg.tierThresholds);
    if (next === account.tier) return { changed: false };
    await this.accounts.applyDelta(customerId, {}, { tier: next, tierUpdatedAt: new Date() });
    await this.customers.pushTimeline(customerId, { at: new Date(), event: TIMELINE_EVENT.TIER_CHANGED, detail: { from: account.tier, to: next } }, config.customer.limits.timeline);
    await this.events.publish(new TierChangedEvent({ customerId: String(customerId), fromTier: account.tier, toTier: next, lifetimePoints: account.lifetimePoints ?? 0, restaurantId: scope.restaurantId }));
    this.audit.success('customer.tier.changed', { targetId: String(customerId), metadata: { from: account.tier, to: next } });
    return { changed: true, from: account.tier, to: next };
  }
}

export const loyaltyService = new LoyaltyService();
export default loyaltyService;
