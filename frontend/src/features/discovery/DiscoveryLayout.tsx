import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { CustomerLayout } from '@/layouts';
import { Icon, Spinner, ThemeToggleButton } from '@/design-system';
import { NotificationCenter } from '@/platform/notifications';
import { discoveryTabs } from './routes';

function RouteFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Spinner />
    </div>
  );
}

/**
 * DiscoveryTabsLayout — the Customer PWA shell for browse surfaces. Reuses the F1
 * CustomerLayout (frosted brand bar + bottom tabs). Tabs come from the route config
 * (`discoveryTabs`), so navigation stays configuration-driven. Active state is
 * derived from the current path.
 */
export function DiscoveryTabsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const tabs = discoveryTabs.map((t) => ({
    ...t,
    active: t.href === '/' ? pathname === '/' : pathname.startsWith(t.href),
  }));

  return (
    <CustomerLayout
      tabs={tabs}
      headerActions={
        <>
          <NotificationCenter />
          <button
            type="button"
            aria-label="Account"
            onClick={() => navigate('/account')}
            className="grid h-9 w-9 place-items-center rounded-md text-foreground-muted hover:bg-muted hover:text-foreground"
          >
            <Icon name="user" className="h-5 w-5" />
          </button>
          <ThemeToggleButton />
        </>
      }
      renderLink={(item, children, className) => (
        <button type="button" className={className} onClick={() => item.href && navigate(item.href)}>
          {children}
        </button>
      )}
    >
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </CustomerLayout>
  );
}

/**
 * DiscoveryMinimalLayout — a focused, tab-less shell for the scanner and branch
 * detail (which own their chrome / full-bleed hero + sticky CTA).
 */
export function DiscoveryMinimalLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-2xl px-4 py-5">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
