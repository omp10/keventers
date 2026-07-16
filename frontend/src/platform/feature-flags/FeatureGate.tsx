import type { ReactNode } from 'react';

import { useFeatureFlags, type FeatureFlag } from './FeatureFlagProvider';

export type FeatureGateProps = {
  /** Enabled when this/these flags are on (all must be on). */
  flag: FeatureFlag | FeatureFlag[];
  /** Render when disabled (default: nothing). */
  fallback?: ReactNode;
  /** Invert — render children when the flag is OFF. */
  not?: boolean;
  children: ReactNode;
};

/**
 * FeatureGate — declaratively render UI behind feature flags. Business components
 * wrap experimental/optional UI in this rather than branching on flags inline.
 */
export function FeatureGate({ flag, fallback = null, not = false, children }: FeatureGateProps) {
  const { isEnabled } = useFeatureFlags();
  const flags = Array.isArray(flag) ? flag : [flag];
  const on = flags.every(isEnabled);
  const show = not ? !on : on;
  return <>{show ? children : fallback}</>;
}
