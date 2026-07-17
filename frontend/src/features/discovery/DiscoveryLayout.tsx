import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { CustomerLayout } from '@/layouts';
import { Spinner, ThemeToggleButton } from '@/design-system';
import { NotificationCenter } from '@/platform/notifications';
import { useNavigation } from '@/navigation';

function RouteFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Spinner />
    </div>
  );
}

/**
 * DiscoveryTabsLayout — the Customer PWA shell for browse surfaces. Reuses the F1
 * CustomerLayout (frosted brand bar + bottom tabs). Tabs come from the navigation
 * config (`customerNav`), which the ordering shell reads too, so the bar is
 * identical on both and changing it means editing config, never a component.
 */
export function DiscoveryTabsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { tabs } = useNavigation('customer', pathname);

  return (
    <CustomerLayout
      tabs={tabs}
      headerActions={
        <>
          {/* No account button here — Profile is a bottom tab now, and two ways
              to reach the same page in one frame is just clutter. */}
          <NotificationCenter />
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
