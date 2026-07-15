/**
 * Module-local DI tokens for the order module. Future modules (Kitchen,
 * Payments, Analytics, Notifications, Loyalty) resolve the OrderService through
 * these tokens — but should prefer consuming ORDER EVENTS over calling it.
 */
export const ORDER_TOKENS = Object.freeze({
  OrderRepository: Symbol('order.OrderRepository'),
  OrderCounterRepository: Symbol('order.OrderCounterRepository'),

  OrderCacheStore: Symbol('order.OrderCacheStore'),
  IdempotencyStore: Symbol('order.IdempotencyStore'),

  OrderService: Symbol('order.OrderService'),
  OrderNumberService: Symbol('order.OrderNumberService'),
  OrderSnapshotService: Symbol('order.OrderSnapshotService'),
  OrderRealtimeService: Symbol('order.OrderRealtimeService'),
});

export default ORDER_TOKENS;
