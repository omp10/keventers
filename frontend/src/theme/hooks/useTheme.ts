import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from '../providers/theme-context';

/**
 * Access the theme: brand, color mode, resolved scheme, reduced-motion, and the
 * setters (setBrand/setMode/toggle). Must be used under <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a <ThemeProvider>.');
  return ctx;
}
