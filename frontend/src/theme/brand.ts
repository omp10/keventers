/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  BRAND ENGINE — the ONE file that rebrands the entire application.          │
 * │  Change the active brand (or edit a preset) and logo, colors, typography,  │
 * │  radius, density and motion update everywhere. NO component is touched.     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * A Brand is a small, declarative override on top of the neutral design system.
 * It does NOT redefine every token — it supplies the *identity* (name, logo,
 * accent colors, shape language) and the resolver derives the full themed CSS
 * variable set for light + dark from it.
 */
import type { ColorScale } from './tokens/palette';
import { amber, emerald, indigo, rose, sky } from './tokens/palette';
import type { RadiusScale } from './tokens/radius';
import type { Density } from './tokens/spacing';
import type { SpringToken } from './tokens/motion';

export type BrandColors = {
  /** Primary brand ramp — buttons, links, focus, active nav. */
  primary: ColorScale;
  /** Secondary accent ramp — highlights, secondary CTAs, charts. */
  accent: ColorScale;
  /** Optional status overrides (else the system defaults are used). */
  success?: ColorScale;
  danger?: ColorScale;
  info?: ColorScale;
  /** Foreground to place ON the primary color (contrast-critical). */
  onPrimaryLight?: string;
  onPrimaryDark?: string;
};

export type BrandTypography = {
  sans?: string;
  display?: string;
  mono?: string;
  /** Global scale multiplier — e.g. a brand that wants slightly larger type. */
  scale?: number;
};

export type Brand = {
  id: string;
  name: string;
  appName: string;
  tagline?: string;
  /** Public asset paths (served from /public/brand/<id>/…) or inline data URIs. */
  logo: { light: string; dark: string; mark: string; favicon: string };
  colors: BrandColors;
  typography?: BrandTypography;
  /** Shape language: how rounded the whole product feels. */
  radius: RadiusScale;
  /** Information density preset. */
  density: Density;
  /** Motion signature — the default spring for interactions. */
  motion: { signature: SpringToken };
};

/* ─────────────────────────── PRESETS ─────────────────────────── */

/** Keventers — warm amber, rounded, comfortable. The default identity. */
export const keventers: Brand = {
  id: 'keventers',
  name: 'Keventers',
  appName: 'Keventers',
  tagline: 'Milkshakes since 1925',
  logo: {
    light: '/brand/keventers/logo.svg',
    dark: '/brand/keventers/logo-dark.svg',
    mark: '/brand/keventers/mark.svg',
    favicon: '/brand/favicon.svg',
  },
  colors: {
    primary: amber,
    accent: indigo,
    success: emerald,
    danger: rose,
    info: sky,
    onPrimaryLight: '#FFFFFF',
    onPrimaryDark: '#1A1206',
  },
  typography: { sans: undefined, scale: 1 },
  radius: 'rounded',
  density: 'comfortable',
  motion: { signature: 'default' },
};

/** Proof of rebrandability #1 — Starbucks: deep green, refined, subtle radius. */
const starbucksGreen: ColorScale = {
  50: '#EDF6F0', 100: '#D3EADB', 200: '#A6D5B8', 300: '#6FB98C',
  400: '#3E9B67', 500: '#00754A', 600: '#006241', 700: '#004E34',
  800: '#003D29', 900: '#00301F', 950: '#001A11',
};
export const starbucks: Brand = {
  id: 'starbucks',
  name: 'Starbucks',
  appName: 'Starbucks',
  tagline: 'To inspire and nurture the human spirit',
  logo: {
    light: '/brand/starbucks/logo.svg',
    dark: '/brand/starbucks/logo.svg',
    mark: '/brand/starbucks/mark.svg',
    favicon: '/brand/starbucks/favicon.svg',
  },
  colors: { primary: starbucksGreen, accent: amber, onPrimaryLight: '#FFFFFF', onPrimaryDark: '#00190F' },
  typography: { scale: 1 },
  radius: 'subtle',
  density: 'comfortable',
  motion: { signature: 'gentle' },
};

/** Proof of rebrandability #2 — McDonald's: bold red/yellow, pill radius, playful. */
const mcdRed: ColorScale = {
  50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5',
  400: '#F87171', 500: '#DA291C', 600: '#BF1B10', 700: '#A11009',
  800: '#7F0D08', 900: '#5F0A06', 950: '#3A0503',
};
const mcdYellow: ColorScale = {
  50: '#FFFBEB', 100: '#FFF3C4', 200: '#FFE585', 300: '#FFD23F',
  400: '#FFC72C', 500: '#F5B800', 600: '#D19A00', 700: '#A67900',
  800: '#7C5A00', 900: '#5C4300', 950: '#332500',
};
export const mcdonalds: Brand = {
  id: 'mcdonalds',
  name: "McDonald's",
  appName: "McDonald's",
  tagline: "I'm lovin' it",
  logo: {
    light: '/brand/mcdonalds/logo.svg',
    dark: '/brand/mcdonalds/logo.svg',
    mark: '/brand/mcdonalds/mark.svg',
    favicon: '/brand/mcdonalds/favicon.svg',
  },
  colors: { primary: mcdRed, accent: mcdYellow, onPrimaryLight: '#FFFFFF', onPrimaryDark: '#FFFFFF' },
  typography: { scale: 1.02 },
  radius: 'pill',
  density: 'spacious',
  motion: { signature: 'snappy' },
};

export const brands = { keventers, starbucks, mcdonalds } as const;
export type BrandId = keyof typeof brands;

/**
 * THE ACTIVE BRAND. Swap this (or load it from env/tenant config at runtime via
 * ThemeProvider's `brand` prop) to rebrand the whole product.
 */
export const defaultBrand: Brand = keventers;
