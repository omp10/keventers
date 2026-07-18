import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Icon, Spinner } from '@/design-system';
import { useNavigation } from '@/navigation';
import { LiveOrderTracker } from './components';
import { cn } from '@/lib/cn';
import { glass } from '@/utils/style';

/**
 * OrderingLayout — a focused shell for the ordering flow. It surfaces network
 * health (reusing the platform ConnectionStatus — offline + socket reconnect) and
 * lazy-loads pages. Pages own their own header + sticky CTAs.
 */
export function OrderingLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { tabs } = useNavigation('customer', pathname);
  // The tab bar belongs on any page a tab can LAND on — otherwise tapping Profile
  // would drop the bar the user just used and strand them. The menu keeps it too
  // (it's where people browse). Focused flows — cart, checkout, order tracking —
  // deliberately don't: they're a funnel, and a nav bar there is an exit sign.
  const isMenu = /^\/r\/[^/]+\/menu(\/|$)/.test(pathname);
  const showCustomerTabs = isMenu || tabs.some((t) => t.href === pathname);

  return (
    <div className={cn('min-h-dvh bg-background', showCustomerTabs && 'pb-[calc(4.5rem+max(env(safe-area-inset-bottom),1.25rem))] lg:pb-0')}>
      <main className="mx-auto w-full max-w-2xl px-4 py-5">
        <Suspense
          fallback={
            <div className="grid min-h-[60vh] place-items-center">
              <Spinner />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      {showCustomerTabs && <LiveOrderTracker />}
      {showCustomerTabs && (
        <nav
          className={cn('fixed inset-x-0 bottom-0 z-[100] flex items-stretch border-t border-border lg:hidden', glass())}
          // max(): see CustomerLayout — Android 15 edge-to-edge reports a 0
          // inset while drawing under the gesture bar.
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
          aria-label="Primary"
        >
          {tabs.map((tab) => {
            const emphasized = tab.emphasized;
            return (
              // min-w-0 + truncate: five tabs must fit 320px-wide Androids and
              // large system fonts without wrapping or stretching the bar.
              <button
                key={tab.key}
                type="button"
                onClick={() => tab.href && navigate(tab.href)}
                className={cn(
                  'flex min-h-14 min-w-0 flex-1 touch-manipulation select-none flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[0.625rem] font-medium text-foreground-subtle min-[400px]:text-[0.6875rem]',
                  emphasized && 'font-semibold text-primary',
                )}
              >
                <span className={cn('grid shrink-0 place-items-center', emphasized && 'h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-brand')}>
                  {tab.icon && <Icon name={tab.icon} size={emphasized ? 'md' : 'sm'} />}
                </span>
                <span className="w-full truncate text-center leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
