/**
 * THEME RESOLVER — the pure function that turns a Brand + color scheme into the
 * flat map of `--kv-*` CSS variable values. Deterministic and side-effect-free
 * (testable). The generator consumes its output to emit the runtime stylesheet.
 *
 * Layering: start from the neutral SEMANTIC tokens for the scheme, then overlay
 * the brand identity (primary/accent ramps, contrast-safe foregrounds, status
 * overrides). Everything downstream (components, gradients) reads the result.
 */
import type { Brand } from '../brand';
import { colorTokens, type ColorRole, type ColorTokens } from '../tokens/colors';
import { shadowTokens } from '../tokens/shadows';
import { radius, radiusScale, type RadiusToken } from '../tokens/radius';
import { density as densityPresets } from '../tokens/spacing';
import { typography } from '../tokens/typography';
import { colorVarName, radiusVarName, shadowVarName, PREFIX } from './css-vars';

export type Scheme = 'light' | 'dark';

/** `color-mix` shorthand — lets the resolver derive in-between canvas steps. */
const mix = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

/** Pick the on-scale step for primary/accent per scheme (dark uses lighter steps). */
function brandRoleColors(brand: Brand, scheme: Scheme): Partial<ColorTokens> {
  const light = scheme === 'light';
  const c = brand.colors;
  const p = c.primary;
  const a = c.accent;
  const s = c.secondary;
  const primary = light ? p[500] : p[400];
  return {
    primary,
    primaryHover: light ? p[600] : p[300],
    primaryActive: light ? p[700] : p[500],
    primaryForeground: light ? (c.onPrimaryLight ?? '#FFFFFF') : (c.onPrimaryDark ?? '#0B0B0F'),
    accent: light ? a[500] : a[400],
    accentForeground: light ? (c.onAccentLight ?? '#FFFFFF') : (c.onAccentDark ?? '#0B0B0F'),
    ring: primary,
    ...(s
      ? {
          brandSecondary: light ? s[700] : s[300],
          brandSecondaryForeground: light ? '#FFFFFF' : s[950],
        }
      : {}),
    ...(c.success ? { success: light ? c.success[600] : c.success[400] } : {}),
    ...(c.warning ? { warning: light ? c.warning[500] : c.warning[400] } : {}),
    ...(c.danger ? { danger: light ? c.danger[600] : c.danger[400] } : {}),
    ...(c.info ? { info: light ? c.info[600] : c.info[400] } : {}),
  };
}

/**
 * Warm/cool NEUTRAL canvas — when a brand supplies a `neutral` scale, the whole
 * canvas (backgrounds, surfaces, borders, inks) takes the brand's temperature.
 * Light mode reads the scale's paper end; dark mode its night end, with
 * intermediate surface steps derived via color-mix so depth layering survives.
 */
function brandCanvasColors(brand: Brand, scheme: Scheme): Partial<ColorTokens> {
  const n = brand.colors.neutral;
  if (!n) return {};
  if (scheme === 'light') {
    return {
      background: mix(n[50], 45, '#FFFFFF'),
      surface: '#FFFFFF',
      surfaceRaised: n[50],
      surfaceSunken: n[100],
      overlay: n[950],
      foreground: n[900],
      foregroundMuted: n[600],
      foregroundSubtle: n[400],
      border: n[200],
      borderStrong: n[300],
      input: n[200],
      secondary: n[100],
      secondaryForeground: n[900],
      muted: n[100],
      mutedForeground: n[500],
    };
  }
  return {
    background: n[950],
    surface: mix(n[900], 45, n[950]),
    surfaceRaised: n[900],
    surfaceSunken: mix(n[950], 82, '#000000'),
    overlay: '#000000',
    foreground: mix(n[50], 94, '#FFFFFF'),
    foregroundMuted: n[400],
    foregroundSubtle: n[600],
    border: mix(n[800], 55, n[950]),
    borderStrong: mix(n[800], 82, n[950]),
    input: mix(n[800], 65, n[950]),
    secondary: mix(n[800], 45, n[950]),
    secondaryForeground: mix(n[50], 94, '#FFFFFF'),
    muted: mix(n[800], 38, n[950]),
    mutedForeground: n[400],
  };
}

/**
 * Categorical chart series — always derived from the resolved brand roles, so
 * analytics rebrand with zero chart-code changes. Order optimizes adjacent-hue
 * separation for the default (primary vs. secondary vs. accent vs. status).
 */
function brandChartColors(resolved: ColorTokens): Partial<ColorTokens> {
  return {
    chart1: resolved.primary,
    chart2: resolved.accent,
    chart3: resolved.brandSecondary,
    chart4: resolved.info,
    chart5: resolved.success,
    chart6: resolved.warning,
  };
}

/** Compute a scheme's full color role map (neutral base ⊕ brand overrides). */
export function resolveColors(brand: Brand, scheme: Scheme): ColorTokens {
  const base: ColorTokens = {
    ...colorTokens[scheme],
    ...brandCanvasColors(brand, scheme),
    ...brandRoleColors(brand, scheme),
  };
  return { ...base, ...brandChartColors(base) };
}

/**
 * Resolve the full `--kv-*` variable map for one scheme. Colors + shadows are
 * scheme-dependent; radius/fonts/scale are scheme-independent (emitted with the
 * light pass, overridden nowhere).
 */
export function resolveScheme(brand: Brand, scheme: Scheme): Record<string, string> {
  const vars: Record<string, string> = {};

  // Colors (all roles).
  const colors = resolveColors(brand, scheme);
  (Object.keys(colors) as ColorRole[]).forEach((role) => {
    vars[colorVarName(role)] = colors[role];
  });

  // Shadows (scheme-dependent).
  const shadows = shadowTokens[scheme];
  (Object.keys(shadows) as (keyof typeof shadows)[]).forEach((t) => {
    vars[shadowVarName(t)] = shadows[t];
  });

  if (scheme === 'light') {
    // Scheme-independent tokens — emit once (on :root).
    const scaleMul = radiusScale[brand.radius];
    (Object.keys(radius) as RadiusToken[]).forEach((t) => {
      const base = radius[t];
      // Fixed sentinels stay put; rem values scale by the brand shape language.
      vars[radiusVarName(t)] =
        t === 'none' || t === 'pill' || t === 'full' || base.endsWith('px')
          ? base
          : `calc(${base} * ${scaleMul})`;
    });

    const scale = brand.typography?.scale ?? 1;
    vars[`${PREFIX}-font-sans`] = brand.typography?.sans ?? typography.fontFamily.sans;
    vars[`${PREFIX}-font-display`] = brand.typography?.display ?? typography.fontFamily.display;
    vars[`${PREFIX}-font-mono`] = brand.typography?.mono ?? typography.fontFamily.mono;
    vars[`${PREFIX}-text-scale`] = String(scale);
    vars[`${PREFIX}-root-font`] = `${densityPresets[brand.density].rootFontPx}px`;
    vars[`${PREFIX}-control-h`] = `${densityPresets[brand.density].controlHeight}rem`;
  }

  return vars;
}

/** Serialize a var map into `prop: value;` declarations. */
export function serializeVars(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}
