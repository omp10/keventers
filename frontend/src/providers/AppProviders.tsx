import { Suspense, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { ThemeProvider, type Brand } from '@/theme';
import { TooltipProvider, Toaster, LoadingOverlay } from '@/design-system';
import { queryClient } from '@/lib/query-client';

import { ErrorBoundary } from '@/platform/error';
import { FeatureFlagProvider } from '@/platform/feature-flags';
import type { FlagMap } from '@/platform/feature-flags';
import { AuthProvider } from '@/platform/auth';
import { SocketProvider } from '@/platform/socket';
import { OfflineProvider } from '@/platform/offline';
import { MapsProvider } from '@/platform/maps';
import { AnalyticsProvider, type AnalyticsContract } from '@/platform/analytics';
import { NotificationProvider } from '@/platform/notifications';
import { CommandProvider } from '@/platform/command';
import { GlobalLoadingBar } from '@/platform/loading';
import { OverlayHost } from '@/platform/overlays';
import type { NavConfig } from '@/navigation';

export type AppProvidersProps = {
  children: ReactNode;
  /** Inject the tenant brand at bootstrap (white-label). */
  brand?: Brand;
  /** Runtime feature-flag overrides layered over env defaults. */
  flags?: FlagMap;
  /** Which nav config powers the command palette's navigation commands. */
  commandNavApp?: NavConfig['app'];
  /** Inject a concrete analytics provider (defaults to no-op). */
  analytics?: AnalyticsContract;
  /** Report render crashes to an error sink (Sentry, etc.). */
  onError?: (error: Error) => void;
  /** Router basename (BrowserRouter). Pass `withRouter={false}` if the app owns routing. */
  basename?: string;
  withRouter?: boolean;
  /** Fallback while lazy routes load. */
  suspenseFallback?: ReactNode;
};

/**
 * APP PROVIDERS — the ONE composition root every Keventers frontend (Customer PWA,
 * Restaurant/Admin dashboards, KDS) mounts. It initializes EVERY platform provider
 * in a deliberate order and mounts the global hosts (loading bar, overlays,
 * toaster). Apps wrap their routes in this once — they never assemble providers
 * individually.
 *
 * Order (outer → inner):
 *   ErrorBoundary → Theme → Router → Query → FeatureFlags → Auth → Socket →
 *   Offline → Maps → Analytics → Notifications → Tooltip → Command → Suspense.
 *
 * Two deliberate deviations from the spec's linear list, both for correctness:
 *  · FeatureFlags is hoisted ABOVE Command/Notifications because `usePermissions`
 *    (used by the palette + guards) composes Auth + FeatureFlags.
 *  · Socket sits under Auth but stays order-independent: `SocketClient` reads its
 *    token from the module-level token store via an injected provider, and
 *    reauthenticates on auth-status changes — so it never imports Auth.
 *  · Location is hook-only (no context/provider needed).
 */
export function AppProviders({
  children,
  brand,
  flags,
  commandNavApp,
  analytics,
  onError,
  basename,
  withRouter = true,
  suspenseFallback,
}: AppProvidersProps) {
  const routed = (inner: ReactNode) => (withRouter ? <BrowserRouter basename={basename}>{inner}</BrowserRouter> : <>{inner}</>);

  return (
    <ErrorBoundary onError={onError}>
      <ThemeProvider brand={brand} defaultMode="system">
        {routed(
          <QueryClientProvider client={queryClient}>
            <FeatureFlagProvider overrides={flags}>
              <AuthProvider>
                <SocketProvider>
                  <OfflineProvider>
                    <MapsProvider>
                      <AnalyticsProvider provider={analytics}>
                        <NotificationProvider>
                          <TooltipProvider delayDuration={250} skipDelayDuration={400}>
                            <CommandProvider navApp={commandNavApp}>
                              <Suspense fallback={suspenseFallback ?? <LoadingOverlay loading variant="fixed" label="Loading…" />}>
                                {children}
                              </Suspense>

                              {/* Global hosts — mounted once, above app content. */}
                              <GlobalLoadingBar />
                              <OverlayHost />
                              <Toaster />
                            </CommandProvider>
                          </TooltipProvider>
                        </NotificationProvider>
                      </AnalyticsProvider>
                    </MapsProvider>
                  </OfflineProvider>
                </SocketProvider>
              </AuthProvider>
            </FeatureFlagProvider>
          </QueryClientProvider>,
        )}
      </ThemeProvider>
    </ErrorBoundary>
  );
}
