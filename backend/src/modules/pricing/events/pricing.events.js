import { DomainEvent } from '#core/eventbus/index.js';

/** Coupon lifecycle events (pricing math itself is pure/synchronous). */
export const PRICING_EVENTS = Object.freeze({
  COUPON_CREATED: 'coupon.created',
  COUPON_UPDATED: 'coupon.updated',
  COUPON_DELETED: 'coupon.deleted',
  COUPON_REDEEMED: 'coupon.redeemed',
});

export class CouponCreatedEvent extends DomainEvent {
  static eventName = PRICING_EVENTS.COUPON_CREATED;
}
export class CouponUpdatedEvent extends DomainEvent {
  static eventName = PRICING_EVENTS.COUPON_UPDATED;
}
export class CouponDeletedEvent extends DomainEvent {
  static eventName = PRICING_EVENTS.COUPON_DELETED;
}
export class CouponRedeemedEvent extends DomainEvent {
  static eventName = PRICING_EVENTS.COUPON_REDEEMED;
}
