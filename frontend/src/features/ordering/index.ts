/**
 * ORDERING FEATURE (Phase F3.2) — the Customer Ordering Platform: menu → product →
 * cart → pricing → checkout → payment → success → live tracking, plus profile,
 * loyalty, notifications, offline, and PWA. Built entirely on F1 + F2 + F3.1;
 * everything routes through the Frontend Platform (services → hooks → API Platform).
 */
export { orderingRoutes, type OrderingRoute } from './routes';
export { OrderingLayout } from './OrderingLayout';

export * from './types';
export * from './format';
export * from './hooks';
export {
  sessionService,
  menuService,
  cartService,
  orderService,
  paymentService,
  loyaltyService,
  profileService,
  newIdempotencyKey,
  type OrderingSession,
  type CheckoutInput,
} from './services';
export * from './components';
export * from './menu';
export * from './cart';
export * from './checkout';
export * from './payment';
export * from './order';
export * from './account';
