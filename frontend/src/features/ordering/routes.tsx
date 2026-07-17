import { lazy, type ReactNode } from 'react';

/**
 * ORDERING ROUTES — the single config for the ordering flow, merged into the app
 * router under the OrderingLayout. Pages are lazy-loaded (code-splitting). Kept
 * separate from Discovery routes so each feature owns its own surface.
 */
export type OrderingRoute = { path: string; element: ReactNode };

const MenuScreen = lazy(() => import('./pages/MenuScreen').then((m) => ({ default: m.MenuScreen })));
const CartPage = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrderPage = lazy(() => import('./pages/OrderPage').then((m) => ({ default: m.OrderPage })));
const AccountPage = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.AccountPage })));
const OrdersPage = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.OrdersPage })));
const LoyaltyPage = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.LoyaltyPage })));
const NotificationsPage = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.NotificationsPage })));
const CustomerLoginPage = lazy(() => import('./pages/CustomerLoginPage').then((m) => ({ default: m.CustomerLoginPage })));

export const orderingRoutes: OrderingRoute[] = [
  { path: '/login', element: <CustomerLoginPage /> },
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
