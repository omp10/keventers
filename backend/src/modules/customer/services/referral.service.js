import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '#core/errors/app-error.js';
import { config } from '#config';

import {
  CUSTOMER_ERRORS,
  LOYALTY_SOURCE,
  REFERRAL_STATUS,
  TIMELINE_EVENT,
} from '../constants/customer.constants.js';
import { toReferralDTO } from '../dto/customer.dto.js';
import { ReferralCompletedEvent, ReferralCreatedEvent } from '../events/customer.events.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { referralRepository } from '../repositories/referral.repository.js';
import { entityId } from '../utils/id.util.js';
import { referralCode } from '../utils/reference.util.js';

import { customerService } from './customer.service.js';
import { loyaltyService } from './loyalty.service.js';

/**
 * Referral service — DESIGN-ONLY for this phase. The data model, code issuance,
 * tracking and completion state machine are in place; the automated CAMPAIGN
 * execution (fraud checks, multi-touch attribution, scheduled payouts) is a later
 * phase. `completeReferral` grants the configured bonus through the loyalty
 * engine's public `grantBonus` seam, so a future campaign engine can drive it
 * without touching customer internals.
 */
export class ReferralService extends BaseService {
  constructor({
    referrals = referralRepository,
    customers = customerRepository,
    customerSvc = customerService,
    loyalty = loyaltyService,
    referralConfig = config.customer.referral,
    eventBus,
  } = {}) {
    super({ name: 'customer.referral', eventBus });
    this.referrals = referrals;
    this.customers = customers;
    this.customerSvc = customerSvc;
    this.loyalty = loyalty;
    this.cfg = referralConfig;
  }

  /** Get (or lazily create) the customer's own shareable referral code. */
  async getMyCode(customerScope) {
    const scope = { organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId };
    const { customer, customerId } = await this.customerSvc.ensureCustomer(scope, customerScope.userId);
    const existing = await this.referrals.findForReferrer(customerId);
    const open = existing.find((r) => r.status === REFERRAL_STATUS.PENDING && !r.refereeUserId);
    if (open) return toReferralDTO(open);
    return this.#mint(scope, customer, customerId, customerScope.userId);
  }

  async #mint(scope, customer, customerId, userId) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const referral = await this.referrals.createScoped(scope, {
          code: referralCode(),
          referrerCustomerId: customerId,
          referrerUserId: userId,
          status: REFERRAL_STATUS.PENDING,
          referrerRewardPoints: this.cfg.rewardPoints,
          refereeRewardPoints: this.cfg.rewardPoints,
        });
        await this.events.publish(new ReferralCreatedEvent({ referralId: entityId(referral), referrerCustomerId: customerId, code: referral.code, restaurantId: scope.restaurantId }));
        return toReferralDTO(referral);
      } catch (err) {
        if (err?.code === 11000 && attempt < 4) continue; // code clash → retry
        throw err;
      }
    }
    return null;
  }

  /**
   * Record that a referee redeemed a code (tracking). Grants are NOT auto-issued
   * here — a campaign engine calls `completeReferral` when the referee qualifies.
   */
  async trackReferral(customerScope, code) {
    const scope = { organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId };
    const referral = await this.referrals.findByCode(scope, code);
    if (!referral) throw new NotFoundError(CUSTOMER_ERRORS.REFERRAL_NOT_FOUND);
    const { customerId } = await this.customerSvc.ensureCustomer(scope, customerScope.userId);
    if (String(referral.referrerCustomerId) === String(customerId)) throw new BadRequestError(CUSTOMER_ERRORS.REFERRAL_SELF);
    if (referral.refereeUserId) throw new ConflictError(CUSTOMER_ERRORS.REFERRAL_NOT_FOUND);
    const updated = await this.referrals.updateById(entityId(referral), {
      refereeCustomerId: customerId,
      refereeUserId: customerScope.userId,
    });
    return toReferralDTO(updated);
  }

  /**
   * Complete a referral → grant both parties the configured bonus (idempotent per
   * party via the loyalty source id). Invoked by a future campaign engine once
   * the referee qualifies; exposed as a seam, not a customer route.
   */
  async completeReferral(referralId) {
    const referral = await this.referrals.findById(referralId);
    if (!referral) throw new NotFoundError(CUSTOMER_ERRORS.REFERRAL_NOT_FOUND);
    if (referral.status === REFERRAL_STATUS.COMPLETED) return toReferralDTO(referral);
    const scope = { organizationId: String(referral.organizationId), restaurantId: String(referral.restaurantId) };

    if (referral.referrerRewardPoints > 0 && !referral.referrerGranted) {
      await this.loyalty.grantBonus({ scope, customerId: String(referral.referrerCustomerId), userId: referral.referrerUserId, points: referral.referrerRewardPoints, source: { type: LOYALTY_SOURCE.REFERRAL, id: `${entityId(referral)}:referrer` }, reason: 'referral_reward' });
    }
    if (referral.refereeRewardPoints > 0 && referral.refereeCustomerId && !referral.refereeGranted) {
      await this.loyalty.grantBonus({ scope, customerId: String(referral.refereeCustomerId), userId: referral.refereeUserId, points: referral.refereeRewardPoints, source: { type: LOYALTY_SOURCE.REFERRAL, id: `${entityId(referral)}:referee` }, reason: 'referral_reward' });
      await this.customers.pushTimeline(String(referral.refereeCustomerId), { at: new Date(), event: TIMELINE_EVENT.REFERRAL_COMPLETED, detail: { referralId: entityId(referral) } }, config.customer.limits.timeline);
    }
    const updated = await this.referrals.updateById(entityId(referral), {
      status: REFERRAL_STATUS.COMPLETED, completedAt: new Date(), referrerGranted: true, refereeGranted: Boolean(referral.refereeCustomerId),
    });
    await this.customers.pushTimeline(String(referral.referrerCustomerId), { at: new Date(), event: TIMELINE_EVENT.REFERRAL_COMPLETED, detail: { referralId: entityId(referral) } }, config.customer.limits.timeline);
    await this.events.publish(new ReferralCompletedEvent({ referralId: entityId(referral), referrerCustomerId: String(referral.referrerCustomerId), refereeCustomerId: referral.refereeCustomerId ? String(referral.refereeCustomerId) : null, restaurantId: scope.restaurantId }));
    this.audit.success('customer.referral.completed', { targetId: entityId(referral) });
    return toReferralDTO(updated);
  }
}

export const referralService = new ReferralService();
export default referralService;
