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

/** Pick the on-scale step for primary/accent per scheme (dark uses lighter steps). */
function brandRoleColors(brand: Brand, scheme: Scheme): Partial<ColorTokens> {
  const light = scheme === 'light';
  const p = brand.colors.primary;
  const a = brand.colors.accent;
  const primary = light ? p[500] : p[400];
  return {
    primary,
    primaryHover: light ? p[600] : p[300],
    primaryActive: light ? p[700] : p[500],
    primaryForeground: light ? (brand.colors.onPrimaryLight ?? '#FFFFFF') : (brand.colors.onPrimaryDark ?? '#0B0B0F'),
    accent: light ? a[500] : a[400],
    accentForeground: light ? '#FFFFFF' : '#0B0B0F',
    ring: primary,
    ...(brand.colors.success ? { success: light ? brand.colors.success[600] : brand.colors.success[400] } : {}),
    ...(brand.colors.danger ? { danger: light ? brand.colors.danger[600] : brand.colors.danger[400] } : {}),
    ...(brand.colors.info ? { info: light ? brand.colors.info[600] : brand.colors.info[400] } : {}),
  };
}

/** Compute a scheme's full color role map (neutral base ⊕ brand overrides). */
export function resolveColors(brand: Brand, scheme: Scheme): ColorTokens {
  return { ...colorTokens[scheme], ...brandRoleColors(brand, scheme) };
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
