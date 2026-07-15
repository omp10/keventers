import { DomainEvent } from '#core/eventbus/index.js';

/**
 * Cart domain events. Published on every meaningful change so future modules
 * (Order, Analytics, Notifications, Loyalty) can react WITHOUT coupling to cart
 * internals. Names are stable + past-tense.
 */
export const CART_EVENTS = Object.freeze({
  CART_CREATED: 'cart.created',
  CART_UPDATED: 'cart.updated',
  CART_ITEM_ADDED: 'cart.item_added',
  CART_ITEM_UPDATED: 'cart.item_updated',
  CART_ITEM_REMOVED: 'cart.item_removed',
  COUPON_APPLIED: 'cart.coupon_applied',
  COUPON_REMOVED: 'cart.coupon_removed',
  CART_LOCKED: 'cart.locked',
  CART_UNLOCKED: 'cart.unlocked',
  CART_EXPIRED: 'cart.expired',
  CART_ABANDONED: 'cart.abandoned',
  CART_CONVERTED: 'cart.converted',
});

export class CartCreatedEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_CREATED;
}
export class CartUpdatedEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_UPDATED;
}
export class CartItemAddedEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_ITEM_ADDED;
}
export class CartItemUpdatedEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_ITEM_UPDATED;
}
export class CartItemRemovedEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_ITEM_REMOVED;
}
export class CouponAppliedEvent extends DomainEvent {
  static eventName = CART_EVENTS.COUPON_APPLIED;
}
export class CouponRemovedEvent extends DomainEvent {
  static eventName = CART_EVENTS.COUPON_REMOVED;
}
export class CartLockedEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_LOCKED;
}
export class CartUnlockedEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_UNLOCKED;
}
export class CartExpiredEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_EXPIRED;
}
export class CartAbandonedEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_ABANDONED;
}
export class CartConvertedEvent extends DomainEvent {
  static eventName = CART_EVENTS.CART_CONVERTED;
}
