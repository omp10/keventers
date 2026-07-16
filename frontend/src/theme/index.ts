/**
 * THEME ENGINE — public surface. Import tokens, the brand engine, the provider
 * and hooks from here. This is the contract the rest of the app builds on; it is
 * the ONLY place visual constants originate.
 */
export * from './tokens';
export * from './brand';

export { ThemeProvider } from './providers/ThemeProvider';
export type { ThemeProviderProps } from './providers/ThemeProvider';
export { ThemeContext } from './providers/theme-context';
export type { ThemeContextValue, ThemeMode } from './providers/theme-context';

export { useTheme } from './hooks/useTheme';
export { useBrand } from './hooks/useBrand';
export type { BrandInfo } from './hooks/useBrand';

export { color, radiusVar, shadowVar, font } from './utils/css-vars';
export { resolveColors, resolveScheme } from './utils/theme-resolver';
export type { Scheme } from './utils/theme-resolver';
export { buildThemeStylesheet, applyBrand, applyScheme } from './utils/theme-generator';
