import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ForbiddenPage, NotFoundPage } from '@/platform/error';
import { RequireAuth, RequireRole } from '@/platform/auth';
import { discoveryRoutes, DiscoveryMinimalLayout, DiscoveryTabsLayout } from '@/features/discovery';
import { orderingRoutes, OrderingLayout } from '@/features/ordering';
import { restaurantRoutes, RestaurantLayout, RestaurantLoginPage } from '@/features/restaurant';
import { catalogRoutes, CatalogLayout } from '@/features/catalog';
import { KitchenShell, KitchenBoardRoute, KitchenDashboardRoute, KitchenOrdersRoute, KitchenStationsRoute, KitchenTablesRoute, KitchenStaffRoute, KitchenHistoryRoute, KitchenMenuRoute, KitchenProfileRoute, KitchenLoginPage, KitchenOnboardingGate, KitchenOnboardingPage, KitchenRegisterPage } from '@/features/kitchen';
import { StaffShell, StaffLoginPage, StaffHomePage, StaffOrdersPage, StaffHistoryPage, StaffNotificationsPage, StaffProfilePage } from '@/features/staff';
import { Showcase } from '@/app/Showcase';
import { AdminLayout, AdminLoginPage, adminRoutes } from '@/features/admin';

/**
 * App root — the Customer Discovery Platform (Phase F3.1). Routes are derived from
 * the discovery route config and grouped by chrome (tabbed shell vs focused). The
 * router itself lives in the Frontend Platform's <AppProviders> (BrowserRouter +
 * Suspense), so this only declares the route tree.
 */
/**
 * LOGIN IS MANDATORY for the whole customer app.
 *
 * Only these customer paths are reachable signed-out — everything else,
 * including "/" and the QR scanner, redirects to /login and comes back after
 * sign-in. Guest (QR) sessions are NOT an identity here: RequireAuth defaults
 * to `allowGuest: false`, so a table session alone no longer opens the app.
 */
const PUBLIC_CUSTOMER_PATHS = new Set(['/login', '/403']);

/** Gate a customer route unless it is explicitly public. */
function gate(path: string, element: ReactNode): ReactNode {
  if (PUBLIC_CUSTOMER_PATHS.has(path)) return element;
  return <RequireAuth redirectTo="/login">{element}</RequireAuth>;
}

export function App() {
  const tabbed = discoveryRoutes.filter((r) => r.chrome === 'tabs');
  const minimal = discoveryRoutes.filter((r) => r.chrome === 'minimal');

  return (
    <>
    <Routes>
      <Route element={<DiscoveryTabsLayout />}>
        {tabbed.map((r) => (
          <Route key={r.path} path={r.path} element={gate(r.path, r.element)} />
        ))}
      </Route>
      <Route element={<DiscoveryMinimalLayout />}>
        {minimal.map((r) => (
          <Route key={r.path} path={r.path} element={gate(r.path, r.element)} />
        ))}
      </Route>
      {/* Ordering flow (F3.2) — menu → cart → checkout → payment → tracking.
          /login is lifted OUT of this shell: it renders AuthLayout's own
          full-bleed split (brand panel + form), which the mobile shell's header,
          bottom tabs and max-w container would otherwise squeeze on desktop.
          Every other app's login (/admin, /kitchen, /staff) is standalone too. */}
      <Route element={<OrderingLayout />}>
        {orderingRoutes.filter((r) => r.path !== '/login').map((r) => (
          <Route key={r.path} path={r.path} element={gate(r.path, r.element)} />
        ))}
      </Route>
      {orderingRoutes.filter((r) => r.path === '/login').map((r) => (
        <Route key={r.path} path={r.path} element={r.element} />
      ))}
      {/* Restaurant Operations Dashboard (F4.1) — staff app under /dashboard, auth-gated. */}
      <Route path="/dashboard/login" element={<RestaurantLoginPage />} />
      <Route path="/kitchen/login" element={<KitchenLoginPage />} />
      <Route path="/kitchen/onboarding" element={<RequireAuth redirectTo="/kitchen/login"><KitchenOnboardingPage /></RequireAuth>} />
      <Route path="/kitchen/onboarding/register" element={<RequireAuth redirectTo="/kitchen/login"><KitchenRegisterPage /></RequireAuth>} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      {/* Staff phone app (F9) — assigned-order worklist behind phone-OTP sign-in. */}
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route
        element={
          <RequireRole
            roles={['staff', 'branch_manager', 'restaurant_manager', 'organization_admin']}
            redirectTo="/staff/login"
          >
            <StaffShell />
          </RequireRole>
        }
      >
        <Route path="/staff" element={<StaffHomePage />} />
        <Route path="/staff/orders" element={<StaffOrdersPage />} />
        <Route path="/staff/history" element={<StaffHistoryPage />} />
        <Route path="/staff/notifications" element={<StaffNotificationsPage />} />
        <Route path="/staff/profile" element={<StaffProfilePage />} />
      </Route>
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
        <Route path="orders" element={<KitchenOrdersRoute />} />
        <Route path="staff" element={<KitchenStaffRoute />} />
        <Route path="tables" element={<KitchenTablesRoute />} />
        {/* Stations stays reachable by URL for multi-line kitchens; it is just off the tab bar. */}
        <Route path="stations" element={<KitchenStationsRoute />} />
        <Route path="history" element={<KitchenHistoryRoute />} />
        <Route path="menu" element={<KitchenMenuRoute />} />
        <Route path="profile" element={<KitchenProfileRoute />} />
      </Route>
      {/* Wrong-role users go to /403, NOT to the login page: the login pages bounce
          an already-authenticated user back here, which loops forever. The 403
          page itself offers the way out (sign out, then sign in as an admin). */}
      <Route element={<RequireRole roles={['super_admin']} redirectTo="/admin/login"><AdminLayout /></RequireRole>}>
        {adminRoutes.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
      </Route>
      {/* The F1 component gallery stays available for design QA. */}
      <Route path="/showcase" element={<Showcase />} />
      {/* /403 is where every role guard sends a signed-in user who lacks the
          role (`forbiddenTo` defaults to it). It was never ROUTED, so it fell
          through to the catch-all and rendered "Page not found" — telling a
          customer who opened /admin that the page does not exist, when it does
          and they simply cannot see it. */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  );
}
