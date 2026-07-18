import { lazy, type ComponentType, type ReactNode } from 'react';
const P = () => import('./AdminPages');
const page = (key: keyof Awaited<ReturnType<typeof P>>) => lazy(() => P().then((m) => ({ default: m[key] as ComponentType })));
export type AdminRoute = { path: string; element: ReactNode };
const Dashboard = page('PlatformDashboardPage'); const Organizations = page('OrganizationsPage'); const Approvals = page('ApprovalsPage'); const Users = page('UsersPage'); const Payments = page('PlatformPaymentsPage'); const Analytics = page('PlatformAnalyticsPage'); const Notifications = page('AdminNotificationsPage'); const Monitoring = page('MonitoringPage'); const Audit = page('AuditLogsPage'); const Flags = page('FeatureFlagsPage'); const Settings = page('PlatformSettingsPage');
const OnboardingFields = lazy(() => import('./OnboardingFieldsPage').then((m) => ({ default: m.OnboardingFieldsPage })));
// Platform content pages (banners / categories / zones / kitchens) — one lazy chunk.
const C = () => import('./content');
const contentPage = (key: keyof Awaited<ReturnType<typeof C>>) => lazy(() => C().then((m) => ({ default: m[key] as ComponentType })));
const Banners = contentPage('BannersPage'); const Categories = contentPage('CategoriesPage'); const Zones = contentPage('ZonesPage'); const Kitchens = contentPage('KitchensPage'); const KitchenDetail = contentPage('KitchenDetailPage');

// Restaurant-scoped management surfaced to the super-admin via a picker.
const AdminRestaurantScoped = lazy(() => import('./AdminRestaurantScoped').then((m) => ({ default: m.AdminRestaurantScoped })));
const SubscriptionsPage = lazy(() => import('@/features/restaurant/pages/SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })));
const JourneysPage = lazy(() => import('@/features/restaurant/pages/JourneysPage').then((m) => ({ default: m.JourneysPage })));
const FeedbackPage = lazy(() => import('@/features/restaurant/pages/FeedbackPage').then((m) => ({ default: m.FeedbackPage })));
const UpsellPage = lazy(() => import('@/features/restaurant/pages/UpsellPage').then((m) => ({ default: m.UpsellPage })));
const scoped = (title: string, description: string, Page: ComponentType) => (
  <AdminRestaurantScoped title={title} description={description} Page={Page} />
);
const AdminCatalog = lazy(() => import('./AdminCatalogPage').then((m) => ({ default: m.AdminCatalogPage })));

export const adminRoutes: AdminRoute[] = [
  { path: '/admin', element: <Dashboard /> }, { path: '/admin/organizations', element: <Organizations /> }, { path: '/admin/approvals', element: <Approvals /> }, { path: '/admin/onboarding-fields', element: <OnboardingFields /> }, { path: '/admin/restaurants', element: <Organizations /> }, { path: '/admin/users', element: <Users /> },
  { path: '/admin/banners', element: <Banners /> }, { path: '/admin/categories', element: <Categories /> }, { path: '/admin/zones', element: <Zones /> }, { path: '/admin/kitchens', element: <Kitchens /> }, { path: '/admin/kitchens/:id', element: <KitchenDetail /> }, { path: '/admin/payments', element: <Payments /> }, { path: '/admin/analytics', element: <Analytics /> }, { path: '/admin/notifications', element: <Notifications /> }, { path: '/admin/flags', element: <Flags /> }, { path: '/admin/audit', element: <Audit /> }, { path: '/admin/monitoring', element: <Monitoring /> }, { path: '/admin/settings', element: <Settings /> },
  { path: '/admin/subscriptions', element: scoped('Subscriptions', 'Create and manage subscription plans per restaurant.', SubscriptionsPage) },
  { path: '/admin/journeys', element: scoped('Customer journeys', 'Every customer visit and the conversion funnel, per restaurant.', JourneysPage) },
  { path: '/admin/feedback', element: scoped('Feedback & NPS', 'Customer ratings and NPS, per restaurant.', FeedbackPage) },
  { path: '/admin/upsell', element: scoped('Upsell rules', 'The recommendation engine and its rules, per restaurant.', UpsellPage) },
  { path: '/admin/products', element: <AdminCatalog tab="products" /> },
  { path: '/admin/menu-categories', element: <AdminCatalog tab="categories" /> },
];
