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
import { amber, cream, emerald, navy, raspberry, rose, teal } from './tokens/palette';
import type { RadiusScale } from './tokens/radius';
import type { Density } from './tokens/spacing';
import type { SpringToken } from './tokens/motion';

export type BrandColors = {
  /** Primary brand ramp — buttons, links, focus, active nav. */
  primary: ColorScale;
  /** Accent ramp — highlights, secondary CTAs, loyalty, charts. */
  accent: ColorScale;
  /**
   * SECONDARY identity ramp — hero surfaces, gradients, map markers, chart
   * series (`brandSecondary` role). NOT the neutral `secondary` button surface.
   */
  secondary?: ColorScale;
  /**
   * Warm/cool NEUTRAL canvas override. When set, backgrounds, surfaces and
   * borders take the brand's temperature (light end = paper, dark end = the
   * brand's night canvas) instead of the system's cool gray.
   */
  neutral?: ColorScale;
  /** Optional status overrides (else the system defaults are used). */
  success?: ColorScale;
  warning?: ColorScale;
  danger?: ColorScale;
  info?: ColorScale;
  /** Foreground to place ON the primary color (contrast-critical). */
  onPrimaryLight?: string;
  onPrimaryDark?: string;
  /** Foreground to place ON the accent color (e.g. dark ink on gold). */
  onAccentLight?: string;
  onAccentDark?: string;
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

/**
 * Keventers — the default identity, extracted from the official brand badge
 * (EST. 1925). Design language:
 *  - PRIMARY   raspberry/magenta — the milkshake + speed-lines. CTAs, focus, nav.
 *  - ACCENT    heritage gold — the badge's upper field. Loyalty, ratings, promos.
 *  - SECONDARY deep navy — the wordmark. Hero panels, gradients, premium anchors.
 *  - INFO      teal — the badge ring. Live/realtime signals, tracking.
 *  - NEUTRAL   cream→navy — warm paper in light mode, branded navy-black at night.
 *  - SHAPE     circular badge + pill bar → soft, friendly radius.
 *  - MOTION    "lively" — playful spring with a wink of overshoot, never bouncy.
 * Premium, warm, appetizing; playful without being childish.
 */
export const keventers: Brand = {
  id: 'keventers',
  name: 'Keventers',
  appName: 'Keventers',
  tagline: 'Scan. Order. Enjoy. Repeat.',
  logo: {
    // The official badge (transparent PNG) — works on light AND dark canvases,
    // so all variants point at the same asset. Swap per-scheme files any time.
    light: '/brand/keventers/logo.png',
    dark: '/brand/keventers/logo.png',
    mark: '/brand/keventers/logo.png',
    favicon: '/brand/keventers/logo.png',
  },
  colors: {
    primary: raspberry,
    accent: amber,
    secondary: navy,
    neutral: cream,
    success: emerald,
    danger: rose,
    info: teal,
    onPrimaryLight: '#FFFFFF',
    onPrimaryDark: '#380D1F',
    onAccentLight: '#43290A',
    onAccentDark: '#2A1B06',
  },
  typography: { sans: undefined, scale: 1 },
  radius: 'soft',
  density: 'comfortable',
  motion: { signature: 'lively' },
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
  colors: { primary: starbucksGreen, accent: amber, onPrimaryLight: '#FFFFFF', onPrimaryDark: '#00190F', onAccentLight: '#3D2606' },
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
  colors: { primary: mcdRed, accent: mcdYellow, onPrimaryLight: '#FFFFFF', onPrimaryDark: '#FFFFFF', onAccentLight: '#442B00' },
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
