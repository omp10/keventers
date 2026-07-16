/**
 * Backdrop-blur scale — powers the "glass" surfaces (navbars, command palette,
 * overlays). Centralized so frosted materials are consistent and can be dialed
 * down globally for low-power devices.
 */
export const blur = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  glass: '20px', // semantic default for glass surfaces
} as const;

export type BlurToken = keyof typeof blur;
