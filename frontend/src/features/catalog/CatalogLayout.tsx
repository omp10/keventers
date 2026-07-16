import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { Spinner } from '@/design-system';
import { useCatalogIntegrations } from './hooks';

/**
 * CatalogLayout — a thin layout nested under the RestaurantLayout (F4.1 shell). It
 * registers the catalog command-palette commands + global-search provider while the
 * user is in the catalog, and lazy-loads catalog pages. No new shell is created —
 * the dashboard AppShell (sidebar/topbar/command/notifications) is reused.
 */
export function CatalogLayout() {
  useCatalogIntegrations();
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[60vh] place-items-center">
          <Spinner />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}
