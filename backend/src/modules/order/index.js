/**
 * Order module — PUBLIC BARREL. Future modules (Kitchen, Payments, Analytics,
 * Loyalty, Notifications) import from here — but should prefer consuming ORDER
 * EVENTS over calling the service. The order is the source of truth.
 */
export { orderModule } from './order.module.js';

// Service singletons (Payments/Kitchen drive extension points via DI tokens).
export { orderService } from './services/order.service.js';
export { orderNumberService } from './services/order-number.service.js';
export { orderSnapshotService } from './services/order-snapshot.service.js';

// DI tokens.
export { ORDER_TOKENS } from './constants/order.tokens.js';

// Domain events + names other modules subscribe to.
export * from './events/order.events.js';

// Extension-point contracts (Payments / Refunds / Split-Bill).
export {
  PaymentProvider,
  RefundProvider,
  SplitBillStrategy,
} from './interfaces/extension-points.interface.js';

// Public constants (Kitchen/Analytics key off the order lifecycle).
export {
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  ORDER_TYPE,
  PAYMENT_STATUS,
  REFUND_STATUS,
  ORDER_PERMISSIONS,
} from './constants/order.constants.js';

// Seeder.
export { orderSeeder, OrderSeeder } from './seeds/order.seeder.js';
