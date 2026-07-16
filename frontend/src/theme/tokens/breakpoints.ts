/**
 * Breakpoints — mobile-first. Values match the Tailwind screens declared in
 * globals.css so JS media queries (`useBreakpoint`) and CSS utilities never
 * drift. Ultra-wide included for kiosk/KDS displays.
 */
export const breakpoints = {
  xs: 380, // small phones
  sm: 640,
  md: 768, // tablet
  lg: 1024, // laptop
  xl: 1280, // desktop
  '2xl': 1536,
  '3xl': 1920, // ultra-wide / TV (Kitchen Display)
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];

export const mediaQuery = (bp: Breakpoint) => `(min-width: ${breakpoints[bp]}px)`;
