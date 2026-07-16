import { Route, Routes } from 'react-router-dom';

import { NotFoundPage } from '@/platform/error';
import { RequireAuth, RequireRole } from '@/platform/auth';
import { discoveryRoutes, DiscoveryMinimalLayout, DiscoveryTabsLayout } from '@/features/discovery';
import { orderingRoutes, OrderingLayout } from '@/features/ordering';
import { restaurantRoutes, RestaurantLayout, RestaurantLoginPage } from '@/features/restaurant';
import { catalogRoutes, CatalogLayout } from '@/features/catalog';
import { KitchenShell, KitchenBoardRoute, KitchenDashboardRoute, KitchenStationsRoute, KitchenLoginPage, KitchenOnboardingGate, KitchenOnboardingPage } from '@/features/kitchen';
import { InstallPrompt } from '@/pwa';
import { Showcase } from '@/app/Showcase';
import { AdminLayout, AdminLoginPage, adminRoutes } from '@/features/admin';

/**
 * App root — the Customer Discovery Platform (Phase F3.1). Routes are derived from
 * the discovery route config and grouped by chrome (tabbed shell vs focused). The
 * router itself lives in the Frontend Platform's <AppProviders> (BrowserRouter +
 * Suspense), so this only declares the route tree.
 */
export function App() {
  const tabbed = discoveryRoutes.filter((r) => r.chrome === 'tabs');
  const minimal = discoveryRoutes.filter((r) => r.chrome === 'minimal');

  return (
    <>
    <Routes>
      <Route element={<DiscoveryTabsLayout />}>
        {tabbed.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>
      <Route element={<DiscoveryMinimalLayout />}>
        {minimal.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>
      {/* Ordering flow (F3.2) — menu → cart → checkout → payment → tracking. */}
      <Route element={<OrderingLayout />}>
        {orderingRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>
      {/* Restaurant Operations Dashboard (F4.1) — staff app under /dashboard, auth-gated. */}
      <Route path="/dashboard/login" element={<RestaurantLoginPage />} />
      <Route path="/kitchen/login" element={<KitchenLoginPage />} />
      <Route path="/kitchen/onboarding" element={<RequireAuth redirectTo="/kitchen/login"><KitchenOnboardingPage /></RequireAuth>} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        element={
          <RequireAuth redirectTo="/dashboard/login">
            <RestaurantLayout />
          </RequireAuth>
        }
      >
        {restaurantRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {/* Catalog Management (F4.2) — nested so it reuses the same shell + auth. */}
        <Route element={<CatalogLayout />}>
          {catalogRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Route>
      </Route>
      {/* Kitchen Display System (F5) — dedicated immersive app at /kitchen, auth-gated. */}
      <Route
        path="/kitchen"
        element={
          <RequireAuth redirectTo="/kitchen/login">
            <KitchenOnboardingGate><KitchenShell /></KitchenOnboardingGate>
          </RequireAuth>
        }
      >
        <Route index element={<KitchenBoardRoute />} />
        <Route path="dashboard" element={<KitchenDashboardRoute />} />
        <Route path="stations" element={<KitchenStationsRoute />} />
      </Route>
      <Route element={<RequireRole roles={['super_admin']} redirectTo="/admin/login"><AdminLayout /></RequireRole>}>
        {adminRoutes.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
      </Route>
      {/* The F1 component gallery stays available for design QA. */}
      <Route path="/showcase" element={<Showcase />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <InstallPrompt />
    </>
  );
}
