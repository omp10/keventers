import { lazy, Suspense, type ComponentType } from 'react';

import { LoadingOverlay } from '@/design-system';

/**
 * Router FOUNDATION. This design-system phase ships no business routes — apps
 * built on this platform define their own route trees with React Router. The
 * helper below is the code-splitting pattern every app should use: lazily import
 * a route and wrap it in a Suspense boundary with a themed loading overlay.
 *
 * Example (in a consuming app):
 *   const routes = [{ path: '/', element: lazyRoute(() => import('./pages/Home')) }];
 *   createBrowserRouter(routes);
 */
export function lazyRoute(factory: () => Promise<{ default: ComponentType<Record<string, never>> }>) {
  const Cmp = lazy(factory);
  return (
    <Suspense fallback={<LoadingOverlay loading variant="fixed" label="Loading…" />}>
      <Cmp />
    </Suspense>
  );
}
