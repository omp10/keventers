import { lazy, type ComponentType, type ReactNode } from 'react';
const P = () => import('./AdminPages');
const page = (key: keyof Awaited<ReturnType<typeof P>>) => lazy(() => P().then((m) => ({ default: m[key] as ComponentType })));
export type AdminRoute = { path: string; element: ReactNode };
const Dashboard = page('PlatformDashboardPage'); const Organizations = page('OrganizationsPage'); const Approvals = page('ApprovalsPage'); const Users = page('UsersPage'); const Payments = page('PlatformPaymentsPage'); const Analytics = page('PlatformAnalyticsPage'); const Notifications = page('AdminNotificationsPage'); const Monitoring = page('MonitoringPage'); const Audit = page('AuditLogsPage'); const Flags = page('FeatureFlagsPage'); const Settings = page('PlatformSettingsPage');
const OnboardingFields = lazy(() => import('./OnboardingFieldsPage').then((m) => ({ default: m.OnboardingFieldsPage })));
// Platform content pages (banners / categories / zones / kitchens) — one lazy chunk.
const C = () => import('./content');
const contentPage = (key: keyof Awaited<ReturnType<typeof C>>) => lazy(() => C().then((m) => ({ default: m[key] as ComponentType })));
const Banners = contentPage('BannersPage'); const Categories = contentPage('CategoriesPage'); const Zones = contentPage('ZonesPage'); const Kitchens = contentPage('KitchensPage');
export const adminRoutes: AdminRoute[] = [
  { path: '/admin', element: <Dashboard /> }, { path: '/admin/organizations', element: <Organizations /> }, { path: '/admin/approvals', element: <Approvals /> }, { path: '/admin/onboarding-fields', element: <OnboardingFields /> }, { path: '/admin/restaurants', element: <Organizations /> }, { path: '/admin/users', element: <Users /> },
  { path: '/admin/banners', element: <Banners /> }, { path: '/admin/categories', element: <Categories /> }, { path: '/admin/zones', element: <Zones /> }, { path: '/admin/kitchens', element: <Kitchens /> }, { path: '/admin/payments', element: <Payments /> }, { path: '/admin/analytics', element: <Analytics /> }, { path: '/admin/notifications', element: <Notifications /> }, { path: '/admin/flags', element: <Flags /> }, { path: '/admin/audit', element: <Audit /> }, { path: '/admin/monitoring', element: <Monitoring /> }, { path: '/admin/settings', element: <Settings /> },
];
