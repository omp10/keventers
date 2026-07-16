/**
 * PRIMITIVE color palettes — the raw, brand-agnostic color ramps (Radix/Tailwind
 * inspired, tuned for premium neutrals + vivid accents). These are NEVER used
 * directly by components; the SEMANTIC token layer (colors.ts) maps them onto
 * roles (background, foreground, primary…) per theme + brand. Two layers = easy
 * rebrand + guaranteed contrast.
 *
 * All values are sRGB hex. The theme resolver converts to CSS custom properties.
 */

export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

/** Cool, near-neutral gray — the structural backbone (Linear/Vercel feel). */
export const neutral: ColorScale = {
  50: '#FAFAFA',
  100: '#F4F4F5',
  200: '#E9E9EC',
  300: '#D6D6DB',
  400: '#A1A1AA',
  500: '#71717A',
  600: '#52525B',
  700: '#3F3F46',
  800: '#27272A',
  900: '#18181B',
  950: '#0B0B0F',
};

/** Keventers signature — warm amber/gold. */
export const amber: ColorScale = {
  50: '#FFF8EB',
  100: '#FEECC7',
  200: '#FDD98A',
  300: '#FCC24D',
  400: '#FBAE24',
  500: '#F59211',
  600: '#D96E07',
  700: '#B44E0A',
  800: '#923D0F',
  900: '#78330F',
  950: '#451A03',
};

export const indigo: ColorScale = {
  50: '#EEF1FF',
  100: '#E0E6FF',
  200: '#C6D0FF',
  300: '#A3B0FF',
  400: '#7C87FB',
  500: '#5B5BF3',
  600: '#4A3FDE',
  700: '#3E31BB',
  800: '#342C97',
  900: '#2F2B78',
  950: '#1C1846',
};

export const emerald: ColorScale = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
  950: '#022C22',
};

export const amberyellow: ColorScale = {
  50: '#FEFCE8',
  100: '#FEF9C3',
  200: '#FEF08A',
  300: '#FDE047',
  400: '#FACC15',
  500: '#EAB308',
  600: '#CA8A04',
  700: '#A16207',
  800: '#854D0E',
  900: '#713F12',
  950: '#422006',
};

export const rose: ColorScale = {
  50: '#FFF1F2',
  100: '#FFE4E6',
  200: '#FECDD3',
  300: '#FDA4AF',
  400: '#FB7185',
  500: '#F43F5E',
  600: '#E11D48',
  700: '#BE123C',
  800: '#9F1239',
  900: '#881337',
  950: '#4C0519',
};

export const sky: ColorScale = {
  50: '#F0F9FF',
  100: '#E0F2FE',
  200: '#BAE6FD',
  300: '#7DD3FC',
  400: '#38BDF8',
  500: '#0EA5E9',
  600: '#0284C7',
  700: '#0369A1',
  800: '#075985',
  900: '#0C4A6E',
  950: '#082F49',
};

export const palettes = { neutral, amber, indigo, emerald, amberyellow: amberyellow, rose, sky } as const;
export type PaletteName = keyof typeof palettes;
