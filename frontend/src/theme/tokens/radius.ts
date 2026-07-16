/**
 * Border-radius scale. Every value derives from a single brand `--radius-base`
 * (set by the brand's `accentStyle`/`radius`), so making the whole product more
 * rounded ("Domino's") or sharper ("Stripe") is a one-token change.
 */
export const radius = {
  none: '0px',
  xs: '0.25rem', // 4
  sm: '0.375rem', // 6
  md: '0.5rem', // 8
  lg: '0.75rem', // 12
  xl: '1rem', // 16
  '2xl': '1.5rem', // 24
  '3xl': '2rem', // 32
  pill: '9999px',
  full: '9999px',
} as const;

export type RadiusToken = keyof typeof radius;

/** Brand radius presets → the `--radius-base` multiplier the resolver applies. */
export const radiusScale = {
  sharp: 0, // square, technical
  subtle: 0.5, // Stripe / Vercel
  rounded: 1, // default (Keventers)
  soft: 1.4, // friendly / consumer
  pill: 2, // playful / kiosk
} as const;
export type RadiusScale = keyof typeof radiusScale;
