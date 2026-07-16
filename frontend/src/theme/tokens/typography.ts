/**
 * Typography tokens — a modular type system. Families, a fluid size ramp (with
 * paired line-height + tracking so text is always optically balanced), weights
 * and semantic text roles (display → caption). Brands may swap families + the
 * base scale ratio without touching a component.
 */

export const fontFamily = {
  // Sans is the workhorse; a brand can point this at Inter, Geist, SF, etc.
  sans: `'InterVariable', 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
  display: `'InterVariable', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`,
  mono: `'JetBrains Mono', 'SFMono-Regular', ui-monospace, Menlo, Consolas, monospace`,
} as const;

export const fontWeight = {
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;
export type FontWeight = keyof typeof fontWeight;

export const letterSpacing = {
  tighter: '-0.03em',
  tight: '-0.015em',
  normal: '0em',
  wide: '0.015em',
  wider: '0.05em',
  widest: '0.12em',
} as const;

export const lineHeight = {
  none: '1',
  tight: '1.15',
  snug: '1.3',
  normal: '1.5',
  relaxed: '1.65',
  loose: '2',
} as const;

/** A single type step: size + its ideal line-height + tracking + weight. */
export type TypeStep = {
  size: string;
  lineHeight: string;
  letterSpacing: string;
  weight: number;
};

/**
 * SEMANTIC text roles. `Text`/`Heading` components consume these by name, so copy
 * stays consistent everywhere. Sizes use rem; the root font-size (density) scales
 * the whole system proportionally.
 */
export const textRoles = {
  displayXl: { size: '4.5rem', lineHeight: '1.05', letterSpacing: '-0.03em', weight: 700 },
  displayLg: { size: '3.5rem', lineHeight: '1.07', letterSpacing: '-0.03em', weight: 700 },
  display: { size: '2.75rem', lineHeight: '1.1', letterSpacing: '-0.025em', weight: 700 },
  h1: { size: '2.25rem', lineHeight: '1.15', letterSpacing: '-0.022em', weight: 700 },
  h2: { size: '1.875rem', lineHeight: '1.2', letterSpacing: '-0.02em', weight: 600 },
  h3: { size: '1.5rem', lineHeight: '1.25', letterSpacing: '-0.018em', weight: 600 },
  h4: { size: '1.25rem', lineHeight: '1.3', letterSpacing: '-0.014em', weight: 600 },
  title: { size: '1.125rem', lineHeight: '1.4', letterSpacing: '-0.01em', weight: 600 },
  bodyLg: { size: '1.0625rem', lineHeight: '1.6', letterSpacing: '0em', weight: 400 },
  body: { size: '0.9375rem', lineHeight: '1.6', letterSpacing: '0em', weight: 400 },
  bodySm: { size: '0.875rem', lineHeight: '1.55', letterSpacing: '0em', weight: 400 },
  label: { size: '0.875rem', lineHeight: '1.4', letterSpacing: '-0.005em', weight: 500 },
  caption: { size: '0.8125rem', lineHeight: '1.45', letterSpacing: '0.005em', weight: 400 },
  overline: { size: '0.6875rem', lineHeight: '1.4', letterSpacing: '0.12em', weight: 600 },
  button: { size: '0.9375rem', lineHeight: '1', letterSpacing: '-0.006em', weight: 600 },
  mono: { size: '0.875rem', lineHeight: '1.5', letterSpacing: '0em', weight: 400 },
} as const satisfies Record<string, TypeStep>;

export type TextRole = keyof typeof textRoles;

export const typography = { fontFamily, fontWeight, letterSpacing, lineHeight, textRoles };
