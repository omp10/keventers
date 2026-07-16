import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { env } from '@/config/env';

/**
 * FEATURE FLAG PLATFORM — the centralized flag engine. No business component ever
 * writes `if (featureEnabled)`; they use `useFeatureFlag('payments')` or wrap UI
 * in `<FeatureGate>`. Defaults come from env; the backend/tenant can override at
 * runtime via `setFlags` (e.g. after fetching a tenant config). Ships the flags
 * the platform knows about; apps extend the union freely.
 */
export type FeatureFlag =
  | 'payments' | 'loyalty' | 'notifications' | 'qrOrdering' | 'discovery'
  | 'maps' | 'analytics' | 'kitchen' | 'experimental' | (string & {});

export type FlagMap = Record<string, boolean>;

type FeatureFlagContextValue = {
  flags: FlagMap;
  isEnabled: (flag: FeatureFlag) => boolean;
  setFlags: (partial: FlagMap) => void;
  setFlag: (flag: FeatureFlag, value: boolean) => void;
};

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export function FeatureFlagProvider({ children, overrides }: { children: ReactNode; overrides?: FlagMap }) {
  const [flags, setFlagsState] = useState<FlagMap>(() => ({ ...env.featureDefaults, ...overrides }));

  const setFlags = useCallback((partial: FlagMap) => setFlagsState((f) => ({ ...f, ...partial })), []);
  const setFlag = useCallback((flag: FeatureFlag, value: boolean) => setFlagsState((f) => ({ ...f, [flag]: value })), []);
  const isEnabled = useCallback((flag: FeatureFlag) => Boolean(flags[flag]), [flags]);

  const value = useMemo(() => ({ flags, isEnabled, setFlags, setFlag }), [flags, isEnabled, setFlags, setFlag]);
  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
}

export function useFeatureFlags(): FeatureFlagContextValue {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within <FeatureFlagProvider>.');
  return ctx;
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
  return useFeatureFlags().isEnabled(flag);
}
