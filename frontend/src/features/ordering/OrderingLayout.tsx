import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { Spinner } from '@/design-system';
import { ConnectionStatus } from '@/shell';

/**
 * OrderingLayout — a focused shell for the ordering flow. It surfaces network
 * health (reusing the platform ConnectionStatus — offline + socket reconnect) and
 * lazy-loads pages. Pages own their own header + sticky CTAs.
 */
export function OrderingLayout() {
  return (
    <div className="min-h-dvh bg-background">
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
    </div>
  );
}
