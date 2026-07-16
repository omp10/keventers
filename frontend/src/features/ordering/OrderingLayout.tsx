import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Icon, Spinner } from '@/design-system';
import { discoveryTabs } from '@/features/discovery';
import { ConnectionStatus } from '@/shell';
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
  const showCustomerTabs = /^\/r\/[^/]+\/menu\/?$/.test(pathname);

  return (
    <div className={cn('min-h-dvh bg-background', showCustomerTabs && 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0')}>
      <ConnectionStatus />
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
      {showCustomerTabs && (
        <nav
          className={cn('fixed inset-x-0 bottom-0 z-[100] flex items-stretch border-t border-border lg:hidden', glass())}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Primary"
        >
          {discoveryTabs.map((tab) => {
            const emphasized = tab.emphasized;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate(tab.href)}
                className={cn(
                  'flex min-h-16 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 py-2 text-[0.6875rem] font-medium text-foreground-subtle',
                  emphasized && 'font-semibold text-primary',
                )}
              >
                <span className={cn('grid place-items-center', emphasized && 'h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-brand')}>
                  <Icon name={tab.icon} size={emphasized ? 'md' : 'sm'} />
                </span>
                {tab.label}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
