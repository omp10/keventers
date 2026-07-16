import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { noopAnalytics, type AnalyticsProvider as AnalyticsContract } from './types';

const AnalyticsContext = createContext<AnalyticsContract>(noopAnalytics);

/**
 * AnalyticsProvider — supplies the app-wide analytics implementation via context.
 * By default it's a no-op; an app injects a real provider that satisfies the
 * `AnalyticsProvider` contract. Business code calls `useAnalytics()` — it never
 * imports a vendor SDK directly.
 */
export function AnalyticsProvider({ provider, children }: { provider?: AnalyticsContract; children: ReactNode }) {
  const value = useMemo(() => provider ?? noopAnalytics, [provider]);
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContract {
  return useContext(AnalyticsContext);
}
