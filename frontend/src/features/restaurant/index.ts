/**
 * RESTAURANT OPERATIONS DASHBOARD (Phase F4.1) — the first staff-facing app, built
 * on F1 + F2. Realtime live orders, KPI/analytics widgets, order detail drawer,
 * board views, search/filters, notifications, and the command palette. Namespaced
 * under /dashboard. Widgets + order components are reusable by the Admin dashboard.
 */
export { restaurantRoutes, LoginPage as RestaurantLoginPage, type RestaurantRoute } from './routes';
export { RestaurantLayout } from './RestaurantLayout';

export * from './types';
export * from './widgets';
export * from './orders';
export * from './hooks';
export * from './realtime';
export { contextService, staffOrderService, staffAnalyticsService } from './services';
export type { OrderFilters, AnalyticsRange } from './services';
export { RestaurantScopeProvider, useRestaurantScope, useScopedApi } from './RestaurantScope';
