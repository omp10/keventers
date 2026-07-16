import { createContext } from 'react';

import type { Brand } from '../brand';
import type { Scheme } from '../utils/theme-resolver';

export type ThemeMode = Scheme | 'system';

export type ThemeContextValue = {
  /** The active brand identity (drives every token). */
  brand: Brand;
  /** Swap the entire brand at runtime (multi-tenant / white-label). */
  setBrand: (brand: Brand) => void;
  /** User preference: light | dark | system. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** The concrete scheme currently rendered (system resolved). */
  scheme: Scheme;
  /** Convenience toggle between light and dark. */
  toggle: () => void;
  /** Whether the OS/user prefers reduced motion (for the motion system). */
  reducedMotion: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
