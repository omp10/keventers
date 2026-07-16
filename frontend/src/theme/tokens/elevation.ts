import type { ShadowToken } from './shadows';

/**
 * SEMANTIC elevation — maps a surface's *role* to a shadow level so components
 * ask for "modal elevation", not a raw shadow. Keeps the z-stacking of surfaces
 * visually coherent across the whole system.
 */
export const elevation = {
  flat: 'none',
  card: 'sm',
  cardHover: 'md',
  raised: 'md',
  dropdown: 'lg',
  popover: 'lg',
  drawer: 'xl',
  modal: 'xl',
  toast: 'lg',
  command: '2xl',
} as const satisfies Record<string, ShadowToken | 'none'>;

export type ElevationRole = keyof typeof elevation;
