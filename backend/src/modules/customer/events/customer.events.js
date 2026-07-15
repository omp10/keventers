import { DomainEvent } from '#core/eventbus/index.js';

/**
 * Customer Platform domain events. Notifications, Analytics and future CRM
 * consume THESE — never the customer services. Loyalty/tier/referral changes are
 * broadcast as clean domain events so campaigns (birthday rewards, tier perks,
 * win-back) can subscribe without any coupling.
 */
export const CUSTOMER_EVENTS = Object.freeze({
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_MERGED: 'customer.merged',
  CUSTOMER_DELETED: 'customer.deleted',

  LOYALTY_POINTS_EARNED: 'customer.loyalty.earned',
  LOYALTY_REDEEMED: 'customer.loyalty.redeemed',
  LOYALTY_EXPIRED: 'customer.loyalty.expired',
  LOYALTY_ADJUSTED: 'customer.loyalty.adjusted',
  TIER_CHANGED: 'customer.tier.changed',

  REWARD_REDEEMED: 'customer.reward.redeemed',
  REFERRAL_CREATED: 'customer.referral.created',
  REFERRAL_COMPLETED: 'customer.referral.completed',
});

const ev = (name) =>
  class extends DomainEvent {
    static eventName = name;
  };

export const CustomerCreatedEvent = ev(CUSTOMER_EVENTS.CUSTOMER_CREATED);
export const CustomerUpdatedEvent = ev(CUSTOMER_EVENTS.CUSTOMER_UPDATED);
export const CustomerMergedEvent = ev(CUSTOMER_EVENTS.CUSTOMER_MERGED);
export const CustomerDeletedEvent = ev(CUSTOMER_EVENTS.CUSTOMER_DELETED);

export const LoyaltyPointsEarnedEvent = ev(CUSTOMER_EVENTS.LOYALTY_POINTS_EARNED);
export const LoyaltyRedeemedEvent = ev(CUSTOMER_EVENTS.LOYALTY_REDEEMED);
export const LoyaltyExpiredEvent = ev(CUSTOMER_EVENTS.LOYALTY_EXPIRED);
export const LoyaltyAdjustedEvent = ev(CUSTOMER_EVENTS.LOYALTY_ADJUSTED);
export const TierChangedEvent = ev(CUSTOMER_EVENTS.TIER_CHANGED);

export const RewardRedeemedEvent = ev(CUSTOMER_EVENTS.REWARD_REDEEMED);
export const ReferralCreatedEvent = ev(CUSTOMER_EVENTS.REFERRAL_CREATED);
export const ReferralCompletedEvent = ev(CUSTOMER_EVENTS.REFERRAL_COMPLETED);
