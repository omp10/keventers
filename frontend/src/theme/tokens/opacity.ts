/**
 * Opacity scale — used for disabled states, overlays, hover washes and layering.
 * Centralized so "disabled" looks identical on every control.
 */
export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  15: '0.15',
  20: '0.2',
  30: '0.3',
  40: '0.4',
  disabled: '0.5', // semantic alias
  60: '0.6',
  70: '0.7',
  80: '0.8',
  90: '0.9',
  100: '1',
} as const;

export type OpacityToken = keyof typeof opacity;
