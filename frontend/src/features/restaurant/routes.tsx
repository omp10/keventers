import { lazy, type ReactNode } from 'react';

/**
 * RESTAURANT DASHBOARD ROUTES — the single config for the staff app, namespaced
 * under /dashboard (coexists with the customer app). Pages are lazy-loaded. The
 * protected routes render under RestaurantLayout behind RequireAuth; login is public.
 */
export type RestaurantRoute = { path: string; element: ReactNode };

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LiveOrdersPage = lazy(() => import('./pages/LiveOrdersPage').then((m) => ({ default: m.LiveOrdersPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const JourneysPage = lazy(() => import('./pages/JourneysPage').then((m) => ({ default: m.JourneysPage })));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })));
const UpsellPage = lazy(() => import('./pages/UpsellPage').then((m) => ({ default: m.UpsellPage })));
const P = () => import('./pages/Placeholders');
const M = () => import('@/features/management');
const CustomersPage = lazy(() => M().then((m) => ({ default: m.CustomersPage })));
const PaymentsPage = lazy(() => M().then((m) => ({ default: m.PaymentsPage })));
const TablesPage = lazy(() => M().then((m) => ({ default: m.TablesPage })));
const QrManagementPage = lazy(() => M().then((m) => ({ default: m.QrManagementPage })));
const StaffPage = lazy(() => M().then((m) => ({ default: m.StaffPage })));
const RolesPage = lazy(() => M().then((m) => ({ default: m.RolesPage })));
const CouponsPage = lazy(() => M().then((m) => ({ default: m.CouponsPage })));
const NotificationsPage = lazy(() => P().then((m) => ({ default: m.RestaurantNotificationsPage })));
const SettingsPage = lazy(() => M().then((m) => ({ default: m.SettingsPage })));

export const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));

export const restaurantRoutes: RestaurantRoute[] = [
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/dashboard/orders', element: <LiveOrdersPage /> },
  { path: '/dashboard/analytics', element: <AnalyticsPage /> },
  { path: '/dashboard/journeys', element: <JourneysPage /> },
  { path: '/dashboard/subscriptions', element: <SubscriptionsPage /> },
  { path: '/dashboard/upsell', element: <UpsellPage /> },
  { path: '/dashboard/customers', element: <CustomersPage /> },
  { path: '/dashboard/payments', element: <PaymentsPage /> },
  { path: '/dashboard/tables', element: <TablesPage /> },
  { path: '/dashboard/qr', element: <QrManagementPage /> },
  { path: '/dashboard/staff', element: <StaffPage /> },
  { path: '/dashboard/staff/roles', element: <RolesPage /> },
  { path: '/dashboard/coupons', element: <CouponsPage /> },
  { path: '/dashboard/notifications', element: <NotificationsPage /> },
  { path: '/dashboard/settings', element: <SettingsPage /> },
];
