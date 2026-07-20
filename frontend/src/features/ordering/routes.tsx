import { lazyRoute } from '@/platform/error';
import { type ReactNode } from 'react';

/**
 * ORDERING ROUTES — the single config for the ordering flow, merged into the app
 * router under the OrderingLayout. Pages are lazy-loaded (code-splitting). Kept
 * separate from Discovery routes so each feature owns its own surface.
 */
export type OrderingRoute = { path: string; element: ReactNode };

const MenuScreen = lazyRoute(() => import('./pages/MenuScreen').then((m) => ({ default: m.MenuScreen })));
const CartPage = lazyRoute(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazyRoute(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrderPage = lazyRoute(() => import('./pages/OrderPage').then((m) => ({ default: m.OrderPage })));
const AccountPage = lazyRoute(() => import('./pages/AccountPages').then((m) => ({ default: m.AccountPage })));
const OrdersPage = lazyRoute(() => import('./pages/AccountPages').then((m) => ({ default: m.OrdersPage })));
const LoyaltyPage = lazyRoute(() => import('./pages/AccountPages').then((m) => ({ default: m.LoyaltyPage })));
const NotificationsPage = lazyRoute(() => import('./pages/AccountPages').then((m) => ({ default: m.NotificationsPage })));
const CustomerLoginPage = lazyRoute(() => import('./pages/CustomerLoginPage').then((m) => ({ default: m.CustomerLoginPage })));
const ScanLandingPage = lazyRoute(() => import('./pages/ScanLandingPage').then((m) => ({ default: m.ScanLandingPage })));

export const orderingRoutes: OrderingRoute[] = [
  { path: '/login', element: <CustomerLoginPage /> },
  // Where every printed table QR points (the backend bakes
  // `QR_PUBLIC_BASE_URL/<code>` into the code itself). Opens the guest session
  // and lands on the menu. Distinct from discovery's /qr, which is the camera.
  { path: '/scan/:code', element: <ScanLandingPage /> },
  // Deep links address the menu by category → subcategory slug. Both segments
  // are OPTIONAL, so every existing /r/:slug/menu link keeps working.
  { path: '/r/:branchSlug/menu', element: <MenuScreen /> },
  { path: '/r/:branchSlug/menu/:categorySlug', element: <MenuScreen /> },
  { path: '/r/:branchSlug/menu/:categorySlug/:subSlug', element: <MenuScreen /> },
  { path: '/cart', element: <CartPage /> },
  { path: '/checkout', element: <CheckoutPage /> },
  { path: '/order/:orderId', element: <OrderPage /> },
  { path: '/orders', element: <OrdersPage /> },
  { path: '/account', element: <AccountPage /> },
  { path: '/loyalty', element: <LoyaltyPage /> },
  { path: '/notifications', element: <NotificationsPage /> },
];
