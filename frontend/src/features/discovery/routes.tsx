import { lazy, type ReactNode } from 'react';

/**
 * DISCOVERY ROUTES — the single config the router is derived from. Adding a route
 * is a one-line change here; nothing is hardcoded in a component. Pages are
 * lazy-loaded for code-splitting.
 *
 * The bottom TAB BAR is not defined here — see `customerNav` in
 * navigation/config.ts.
 *
 * `chrome`:
 *   · 'tabs'    — inside the tabbed Customer shell (browse surfaces)
 *   · 'minimal' — focused, no bottom tabs (scanner, branch detail)
 */
export type DiscoveryRoute = {
  path: string;
  element: ReactNode;
  chrome: 'tabs' | 'minimal';
};

const EntryPage = lazy(() => import('./pages/EntryPage').then((m) => ({ default: m.EntryPage })));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const NearbyPage = lazy(() => import('./pages/NearbyPage').then((m) => ({ default: m.NearbyPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const ScannerPage = lazy(() => import('./pages/ScannerPage').then((m) => ({ default: m.ScannerPage })));
const ManualQrPage = lazy(() => import('./pages/ManualQrPage').then((m) => ({ default: m.ManualQrPage })));
const RestaurantDetailPage = lazy(() => import('./pages/RestaurantDetailPage').then((m) => ({ default: m.RestaurantDetailPage })));

// These declare ROUTES and their chrome only. The bottom tab bar is NOT derived
// from this list: it spans features (Profile is an ordering route) and must stay
// identical across shells, so it lives in `customerNav` (navigation/config.ts).
// Routes without a tab — /discover, /search — remain fully reachable by link.
export const discoveryRoutes: DiscoveryRoute[] = [
  { path: '/', element: <EntryPage />, chrome: 'tabs' },
  { path: '/discover', element: <DiscoverPage />, chrome: 'tabs' },
  { path: '/qr', element: <ScannerPage />, chrome: 'minimal' },
  { path: '/nearby', element: <NearbyPage />, chrome: 'tabs' },
  { path: '/favorites', element: <FavoritesPage />, chrome: 'tabs' },
  { path: '/search', element: <SearchPage />, chrome: 'tabs' },
  { path: '/qr/manual', element: <ManualQrPage />, chrome: 'minimal' },
  { path: '/r/:branchSlug', element: <RestaurantDetailPage />, chrome: 'minimal' },
];
