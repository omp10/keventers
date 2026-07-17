/**
 * DISCOVERY FEATURE — the first business application (Customer Discovery Platform)
 * built entirely on the F1 Design System + F2 Frontend Platform. Everything
 * discovery-related lives under this feature: entry engine, branch discovery,
 * detail, search, filters, maps, scanner, favorites, and routing.
 *
 * Modular by design: Delivery, Reservations, Promotions, and Marketplace can plug
 * into these abstractions (services, hooks, cards, filters, entry engine) without
 * redesign.
 */
export { discoveryRoutes, type DiscoveryRoute } from './routes';
export { DiscoveryTabsLayout, DiscoveryMinimalLayout } from './DiscoveryLayout';

export * from './types';
export * from './entry';
export * from './hooks';
export * from './location';
export * from './favorites';
export * from './components';
export * from './filters';
export * from './search';
export * from './scanner';
export * from './restaurant-detail';
export { discoveryService, qrService, type QrResolution } from './services';
export { HomeScreen } from './home/HomeScreen';
export { DiscoveryBrowser } from './pages/DiscoveryBrowser';
