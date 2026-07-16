import { lazy, type ReactNode } from 'react';

import type { IconName } from '@/design-system';

/**
 * DISCOVERY ROUTES — the SINGLE config the router AND the bottom-tab navigation are
 * derived from. Adding a route (and optionally a tab) is a one-line change here;
 * nothing is hardcoded in a component. Pages are lazy-loaded for code-splitting.
 *
 * `chrome`:
 *   · 'tabs'    — inside the tabbed Customer shell (browse surfaces)
 *   · 'minimal' — focused, no bottom tabs (scanner, branch detail)
 */
export type DiscoveryRoute = {
  path: string;
  element: ReactNode;
  chrome: 'tabs' | 'minimal';
  tab?: { key: string; label: string; icon: IconName; emphasized?: boolean };
};

const EntryPage = lazy(() => import('./pages/EntryPage').then((m) => ({ default: m.EntryPage })));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const NearbyPage = lazy(() => import('./pages/NearbyPage').then((m) => ({ default: m.NearbyPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const ScannerPage = lazy(() => import('./pages/ScannerPage').then((m) => ({ default: m.ScannerPage })));
const ManualQrPage = lazy(() => import('./pages/ManualQrPage').then((m) => ({ default: m.ManualQrPage })));
const RestaurantDetailPage = lazy(() => import('./pages/RestaurantDetailPage').then((m) => ({ default: m.RestaurantDetailPage })));

// NOTE: tab ORDER follows this array (see `discoveryTabs`). Scan sits in the
// MIDDLE deliberately — it's the raised primary action and the thumb's easiest
// reach on a phone.
export const discoveryRoutes: DiscoveryRoute[] = [
  { path: '/', element: <EntryPage />, chrome: 'tabs', tab: { key: 'home', label: 'Home', icon: 'home' } },
  { path: '/discover', element: <DiscoverPage />, chrome: 'tabs', tab: { key: 'discover', label: 'Discover', icon: 'search' } },
  { path: '/qr', element: <ScannerPage />, chrome: 'minimal', tab: { key: 'scan', label: 'Scan', icon: 'qr', emphasized: true } },
  { path: '/nearby', element: <NearbyPage />, chrome: 'tabs', tab: { key: 'nearby', label: 'Nearby', icon: 'store' } },
  { path: '/favorites', element: <FavoritesPage />, chrome: 'tabs', tab: { key: 'favorites', label: 'Saved', icon: 'star' } },
  { path: '/search', element: <SearchPage />, chrome: 'tabs' },
  { path: '/qr/manual', element: <ManualQrPage />, chrome: 'minimal' },
  { path: '/r/:branchSlug', element: <RestaurantDetailPage />, chrome: 'minimal' },
];

/** Tab items for the bottom nav, derived from the route config. */
export const discoveryTabs = discoveryRoutes
  .filter((r) => r.tab)
  .map((r) => ({ ...r.tab!, href: r.path }));
