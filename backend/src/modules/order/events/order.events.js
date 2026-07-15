import { DomainEvent } from '#core/eventbus/index.js';

/**
 * Order domain events. Future modules (Kitchen, Notifications, Analytics,
 * Loyalty, Payments) MUST consume these instead of calling the Order Service —
 * the order is the source of truth and publishes every state change.
 */
export const ORDER_EVENTS = Object.freeze({
  ORDER_CREATED: 'order.created',
  ORDER_PLACED: 'order.placed',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_PREPARING: 'order.preparing',
  ORDER_READY: 'order.ready',
  ORDER_SERVED: 'order.served',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_NOTE_ADDED: 'order.note_added',
  ORDER_PAYMENT_UPDATED: 'order.payment_updated',
  ORDER_REFUND_REQUESTED: 'order.refund_requested',
  ORDER_REFUND_APPROVED: 'order.refund_approved',
  ORDER_REFUND_REJECTED: 'order.refund_rejected',
  ORDER_REFUNDED: 'order.refunded',
  // Kitchen extension seam: emitted on CONFIRMED so a future Kitchen module can
  // create a queue entry WITHOUT the order module knowing about kitchens.
  KITCHEN_QUEUE_REQUESTED: 'kitchen.queue.requested',
});

const ev = (name) =>
  class extends DomainEvent {
    static eventName = name;
  };

export const OrderCreatedEvent = ev(ORDER_EVENTS.ORDER_CREATED);
export const OrderPlacedEvent = ev(ORDER_EVENTS.ORDER_PLACED);
export const OrderConfirmedEvent = ev(ORDER_EVENTS.ORDER_CONFIRMED);
export const OrderPreparingEvent = ev(ORDER_EVENTS.ORDER_PREPARING);
export const OrderReadyEvent = ev(ORDER_EVENTS.ORDER_READY);
export const OrderServedEvent = ev(ORDER_EVENTS.ORDER_SERVED);
export const OrderCompletedEvent = ev(ORDER_EVENTS.ORDER_COMPLETED);
export const OrderCancelledEvent = ev(ORDER_EVENTS.ORDER_CANCELLED);
export const OrderNoteAddedEvent = ev(ORDER_EVENTS.ORDER_NOTE_ADDED);
export const OrderPaymentUpdatedEvent = ev(ORDER_EVENTS.ORDER_PAYMENT_UPDATED);
export const OrderRefundRequestedEvent = ev(ORDER_EVENTS.ORDER_REFUND_REQUESTED);
export const OrderRefundApprovedEvent = ev(ORDER_EVENTS.ORDER_REFUND_APPROVED);
export const OrderRefundRejectedEvent = ev(ORDER_EVENTS.ORDER_REFUND_REJECTED);
export const OrderRefundedEvent = ev(ORDER_EVENTS.ORDER_REFUNDED);
export const KitchenQueueRequestedEvent = ev(ORDER_EVENTS.KITCHEN_QUEUE_REQUESTED);

/** Map an order status to its domain event class (for transitions). */
export const STATUS_EVENT = Object.freeze({
  placed: OrderPlacedEvent,
  confirmed: OrderConfirmedEvent,
  preparing: OrderPreparingEvent,
  ready: OrderReadyEvent,
  served: OrderServedEvent,
  completed: OrderCompletedEvent,
  cancelled: OrderCancelledEvent,
  refunded: OrderRefundedEvent,
});
