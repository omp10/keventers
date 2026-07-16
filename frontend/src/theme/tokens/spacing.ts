/**
 * Spacing scale — a single 4px-based rhythm used for padding, margin, gap and
 * layout everywhere. Values are rem so they scale with density. Never hardcode a
 * pixel gap in a component; reference a step (`space[4]`) or a Tailwind class
 * (`p-4`) that maps to it.
 */
export const spacing = {
  0: '0rem',
  px: '1px',
  0.5: '0.125rem', // 2
  1: '0.25rem', // 4
  1.5: '0.375rem', // 6
  2: '0.5rem', // 8
  2.5: '0.625rem', // 10
  3: '0.75rem', // 12
  3.5: '0.875rem', // 14
  4: '1rem', // 16
  5: '1.25rem', // 20
  6: '1.5rem', // 24
  7: '1.75rem', // 28
  8: '2rem', // 32
  9: '2.25rem', // 36
  10: '2.5rem', // 40
  11: '2.75rem', // 44 — min touch target
  12: '3rem', // 48
  14: '3.5rem', // 56
  16: '4rem', // 64
  20: '5rem', // 80
  24: '6rem', // 96
  28: '7rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  56: '14rem',
  64: '16rem',
} as const;

export type SpaceToken = keyof typeof spacing;

/**
 * Density presets scale the ROOT font-size, shrinking/growing the entire rem-based
 * system (spacing + type + radius) in one move — no per-component work.
 */
export const density = {
  compact: { rootFontPx: 15, controlHeight: 2.25 }, // dashboards / data-dense
  comfortable: { rootFontPx: 16, controlHeight: 2.5 }, // default
  spacious: { rootFontPx: 17, controlHeight: 2.75 }, // marketing / kiosk
} as const;
export type Density = keyof typeof density;
