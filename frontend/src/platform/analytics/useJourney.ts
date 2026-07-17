import { useCallback } from 'react';

import { useAnalytics } from './AnalyticsProvider';
import type { JourneyEvent, JourneyProperties } from './journey';

/**
 * How the journey layer learns which outlet an event belongs to.
 *
 * Injected rather than imported so this platform module stays independent of the
 * discovery feature — the platform must not depend on a feature. `AppProviders`
 * supplies the real resolver.
 */
let resolveOutlet: () => string | null = () => null;

/** Wire the active-outlet source once, at app composition. */
export function setJourneyOutletResolver(resolver: () => string | null) {
  resolveOutlet = resolver;
}

/**
 * The hook every surface uses to record a journey step.
 *
 * Over `useAnalytics().track()` it adds exactly two things, both there to stop
 * call sites getting it wrong:
 *
 *  1. The event name is typed to the `JOURNEY` vocabulary, so a funnel can't be
 *     broken by a typo that no test would catch.
 *  2. `outlet` is stamped on automatically. The client runs ~200 branches and
 *     will ask "why does THIS one convert worse" — a funnel that can't be sliced
 *     per outlet can't answer that, and leaving it to each call site means the
 *     one that forgets goes silently missing from the slice. An explicitly passed
 *     `outletSlug` still wins: the caller knows more than the ambient default.
 */
export function useJourney() {
  const analytics = useAnalytics();

  return useCallback(
    (event: JourneyEvent, properties?: JourneyProperties) => {
      const outletSlug = properties?.outletSlug ?? resolveOutlet() ?? undefined;
      analytics.track(event, outletSlug ? { ...properties, outletSlug } : properties);
    },
    [analytics],
  );
}
