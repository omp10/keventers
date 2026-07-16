/**
 * SEMANTIC color tokens. Every color a component may reference is a ROLE here —
 * never a raw hex. A role has a light + dark value; the resolver emits them as
 * CSS custom properties (`--color-<role>`) so the exact same class works in both
 * schemes and any brand. This is the contract components code against.
 *
 * Format: sRGB hex. Alpha variants are expressed via `color-mix` at the CSS layer
 * (see css-vars) so a single role scales to overlays/rings/hovers.
 */
import { amber, emerald, indigo, neutral, rose, sky, amberyellow } from './palette';

export type ColorRole =
  | 'background'
  | 'surface'
  | 'surfaceRaised'
  | 'surfaceSunken'
  | 'overlay'
  | 'foreground'
  | 'foregroundMuted'
  | 'foregroundSubtle'
  | 'border'
  | 'borderStrong'
  | 'input'
  | 'ring'
  | 'primary'
  | 'primaryForeground'
  | 'primaryHover'
  | 'primaryActive'
  | 'secondary'
  | 'secondaryForeground'
  | 'accent'
  | 'accentForeground'
  /** The brand's SECONDARY identity color (hero surfaces, gradients, markers) —
   *  distinct from `secondary`, which is the neutral subtle-button surface. */
  | 'brandSecondary'
  | 'brandSecondaryForeground'
  | 'muted'
  | 'mutedForeground'
  | 'success'
  | 'successForeground'
  | 'warning'
  | 'warningForeground'
  | 'danger'
  | 'dangerForeground'
  | 'info'
  | 'infoForeground'
  /** Categorical chart series — derived from the brand by the resolver so every
   *  chart is on-brand without a single hardcoded hex in chart code. */
  | 'chart1'
  | 'chart2'
  | 'chart3'
  | 'chart4'
  | 'chart5'
  | 'chart6';

export type ColorTokens = Record<ColorRole, string>;

/**
 * Default LIGHT theme. Brands override only `primary`/`accent` families; the
 * neutral structure stays consistent so every app feels like one ecosystem.
 */
export const lightColors: ColorTokens = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceRaised: neutral[50],
  surfaceSunken: neutral[100],
  overlay: neutral[950],

  foreground: neutral[900],
  foregroundMuted: neutral[600],
  foregroundSubtle: neutral[400],

  border: neutral[200],
  borderStrong: neutral[300],
  input: neutral[200],
  ring: amber[500],

  primary: amber[500],
  primaryForeground: '#FFFFFF',
  primaryHover: amber[600],
  primaryActive: amber[700],

  secondary: neutral[100],
  secondaryForeground: neutral[900],

  accent: indigo[500],
  accentForeground: '#FFFFFF',

  brandSecondary: indigo[700],
  brandSecondaryForeground: '#FFFFFF',

  muted: neutral[100],
  mutedForeground: neutral[500],

  success: emerald[600],
  successForeground: '#FFFFFF',
  warning: amberyellow[500],
  warningForeground: neutral[950],
  danger: rose[600],
  dangerForeground: '#FFFFFF',
  info: sky[600],
  infoForeground: '#FFFFFF',

  chart1: amber[500],
  chart2: indigo[500],
  chart3: indigo[700],
  chart4: sky[600],
  chart5: emerald[600],
  chart6: amberyellow[500],
};

/**
 * Default DARK theme — a deep, near-black canvas (Arc/Linear). Not pure black:
 * layered neutrals give depth; foregrounds sit at ~90% for reduced eye strain.
 */
export const darkColors: ColorTokens = {
  background: neutral[950],
  surface: '#121216',
  surfaceRaised: '#191920',
  surfaceSunken: '#0E0E12',
  overlay: '#000000',

  foreground: '#F4F4F6',
  foregroundMuted: neutral[400],
  foregroundSubtle: neutral[600],

  border: '#26262E',
  borderStrong: '#33333D',
  input: '#2A2A32',
  ring: amber[400],

  primary: amber[400],
  primaryForeground: neutral[950],
  primaryHover: amber[300],
  primaryActive: amber[500],

  secondary: '#1E1E25',
  secondaryForeground: '#F4F4F6',

  accent: indigo[400],
  accentForeground: neutral[950],

  brandSecondary: indigo[300],
  brandSecondaryForeground: neutral[950],

  muted: '#1C1C22',
  mutedForeground: neutral[400],

  success: emerald[400],
  successForeground: neutral[950],
  warning: amberyellow[400],
  warningForeground: neutral[950],
  danger: rose[400],
  dangerForeground: neutral[950],
  info: sky[400],
  infoForeground: neutral[950],

  chart1: amber[400],
  chart2: indigo[400],
  chart3: indigo[300],
  chart4: sky[400],
  chart5: emerald[400],
  chart6: amberyellow[400],
};

export const colorTokens = { light: lightColors, dark: darkColors };
