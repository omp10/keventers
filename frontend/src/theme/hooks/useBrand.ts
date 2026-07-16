import { useTheme } from './useTheme';
import type { Brand } from '../brand';

export type BrandInfo = {
  brand: Brand;
  setBrand: (brand: Brand) => void;
  /** The logo variant to render for the current scheme. */
  logoSrc: string;
  /** The square mark (for collapsed nav / favicons / avatars). */
  markSrc: string;
  appName: string;
  tagline?: string;
};

/**
 * Brand-aware accessor. Resolves the correct logo for the active scheme so
 * `<Logo/>`-style components never branch on light/dark themselves.
 */
export function useBrand(): BrandInfo {
  const { brand, setBrand, scheme } = useTheme();
  return {
    brand,
    setBrand,
    logoSrc: scheme === 'dark' ? brand.logo.dark : brand.logo.light,
    markSrc: brand.logo.mark,
    appName: brand.appName,
    tagline: brand.tagline,
  };
}
