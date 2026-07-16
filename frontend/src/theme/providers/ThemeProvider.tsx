import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { defaultBrand, type Brand } from '../brand';
import { applyBrand, applyScheme } from '../utils/theme-generator';
import type { Scheme } from '../utils/theme-resolver';
import { ThemeContext, type ThemeMode } from './theme-context';

const STORAGE_KEY = 'kv-theme';

export type ThemeProviderProps = {
  children: ReactNode;
  /** Initial brand (e.g. resolved from the tenant at bootstrap). */
  brand?: Brand;
  /**
   * Mode for a first-time visitor who hasn't chosen one yet. Defaults to
   * 'light' (matching index.html's pre-paint script) so the brand's warm canvas
   * is the first impression rather than whatever the OS happens to be set to.
   */
  defaultMode?: ThemeMode;
  /** Persist the user's mode preference (default true). */
  persist?: boolean;
};

function readStoredMode(fallback: ThemeMode): ThemeMode {
  if (typeof localStorage === 'undefined') return fallback;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : fallback;
}

/**
 * The root theming provider. Owns the active brand + color mode, applies them to
 * the DOM (via the generator), reacts to OS scheme/motion changes, and exposes
 * the theme context. Mount ONCE at the app root, above everything.
 */
export function ThemeProvider({ children, brand: initialBrand = defaultBrand, defaultMode = 'light', persist = true }: ThemeProviderProps) {
  const [brand, setBrandState] = useState<Brand>(initialBrand);
  const [mode, setModeState] = useState<ThemeMode>(() => (persist ? readStoredMode(defaultMode) : defaultMode));
  const [scheme, setScheme] = useState<Scheme>('light');
  const [reducedMotion, setReducedMotion] = useState(false);

  // Apply the brand's variable stylesheet whenever the brand changes.
  useEffect(() => {
    applyBrand(brand);
  }, [brand]);

  // Apply + persist the color mode; resolve `system` to a concrete scheme.
  useEffect(() => {
    setScheme(applyScheme(mode));
    if (persist && typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, persist]);

  // Follow the OS when in `system` mode.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (mode === 'system') setScheme(applyScheme('system'));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  // Track reduced-motion for the motion system.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const setBrand = useCallback((next: Brand) => setBrandState(next), []);
  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const toggle = useCallback(() => setModeState((m) => (m === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(
    () => ({ brand, setBrand, mode, setMode, scheme, toggle, reducedMotion }),
    [brand, setBrand, mode, setMode, scheme, toggle, reducedMotion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
