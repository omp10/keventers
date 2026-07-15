import { DomainEvent } from '#core/eventbus/index.js';

/**
 * Kitchen domain events. The KDS communicates OUTWARD only through these — it
 * never calls Payments/Notifications/Analytics directly. Those modules subscribe.
 */
export const KITCHEN_EVENTS = Object.freeze({
  ORDER_QUEUED: 'kitchen.order.queued',
  ORDER_ASSIGNED: 'kitchen.order.assigned',
  ORDER_PREPARING: 'kitchen.order.preparing',
  ORDER_READY: 'kitchen.order.ready',
  ORDER_SERVED: 'kitchen.order.served',
  ORDER_RECALLED: 'kitchen.order.recalled',
  ORDER_REFIRED: 'kitchen.order.refired',
  ORDER_CANCELLED: 'kitchen.order.cancelled',
  SLA_BREACHED: 'kitchen.sla.breached',
});

const ev = (name) =>
  class extends DomainEvent {
    static eventName = name;
  };

export const KitchenOrderQueuedEvent = ev(KITCHEN_EVENTS.ORDER_QUEUED);
export const KitchenOrderAssignedEvent = ev(KITCHEN_EVENTS.ORDER_ASSIGNED);
export const KitchenOrderPreparingEvent = ev(KITCHEN_EVENTS.ORDER_PREPARING);
export const KitchenOrderReadyEvent = ev(KITCHEN_EVENTS.ORDER_READY);
export const KitchenOrderServedEvent = ev(KITCHEN_EVENTS.ORDER_SERVED);
export const KitchenOrderRecalledEvent = ev(KITCHEN_EVENTS.ORDER_RECALLED);
export const KitchenOrderRefiredEvent = ev(KITCHEN_EVENTS.ORDER_REFIRED);
export const KitchenOrderCancelledEvent = ev(KITCHEN_EVENTS.ORDER_CANCELLED);
export const KitchenSlaBreachedEvent = ev(KITCHEN_EVENTS.SLA_BREACHED);

/** Map a kitchen status to its domain event class (for transitions). */
export const STATUS_EVENT = Object.freeze({
  assigned: KitchenOrderAssignedEvent,
  preparing: KitchenOrderPreparingEvent,
  ready: KitchenOrderReadyEvent,
  served: KitchenOrderServedEvent,
  recalled: KitchenOrderRecalledEvent,
  refired: KitchenOrderRefiredEvent,
  cancelled: KitchenOrderCancelledEvent,
});
