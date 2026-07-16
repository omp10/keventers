/**
 * Shadow / elevation tokens. Soft, layered, low-opacity shadows (Apple/Notion) —
 * never a single harsh drop shadow. Each level composes ambient + direct light.
 * Dark themes use deeper, tighter shadows since there's no light to lift against.
 */
export type ShadowTokens = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  focus: string;
  /** Primary-tinted lift — hero CTAs, floating cart, featured cards. */
  brand: string;
  /** Soft brand halo — active/selected emphasis (QR frame, live order pulse). */
  glow: string;
};

export const lightShadows: ShadowTokens = {
  xs: '0 1px 2px 0 rgb(16 16 20 / 0.05)',
  sm: '0 1px 2px 0 rgb(16 16 20 / 0.06), 0 1px 3px 0 rgb(16 16 20 / 0.10)',
  md: '0 2px 4px -1px rgb(16 16 20 / 0.06), 0 4px 8px -2px rgb(16 16 20 / 0.10)',
  lg: '0 4px 8px -2px rgb(16 16 20 / 0.06), 0 12px 20px -4px rgb(16 16 20 / 0.12)',
  xl: '0 8px 16px -4px rgb(16 16 20 / 0.08), 0 24px 40px -8px rgb(16 16 20 / 0.16)',
  '2xl': '0 24px 48px -12px rgb(16 16 20 / 0.24)',
  inner: 'inset 0 1px 2px 0 rgb(16 16 20 / 0.06)',
  focus: '0 0 0 3px var(--color-ring-soft)',
  brand:
    '0 2px 6px -2px color-mix(in oklab, var(--color-primary) 26%, transparent), 0 10px 24px -8px color-mix(in oklab, var(--color-primary) 30%, transparent)',
  glow: '0 0 0 1px color-mix(in oklab, var(--color-primary) 20%, transparent), 0 6px 28px -6px color-mix(in oklab, var(--color-primary) 42%, transparent)',
};

export const darkShadows: ShadowTokens = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.30)',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.40), 0 1px 3px 0 rgb(0 0 0 / 0.50)',
  md: '0 2px 4px -1px rgb(0 0 0 / 0.40), 0 4px 10px -2px rgb(0 0 0 / 0.55)',
  lg: '0 4px 10px -2px rgb(0 0 0 / 0.45), 0 14px 24px -6px rgb(0 0 0 / 0.60)',
  xl: '0 10px 20px -4px rgb(0 0 0 / 0.55), 0 28px 48px -12px rgb(0 0 0 / 0.70)',
  '2xl': '0 32px 64px -16px rgb(0 0 0 / 0.80)',
  inner: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.40)',
  focus: '0 0 0 3px var(--color-ring-soft)',
  brand:
    '0 2px 8px -2px color-mix(in oklab, var(--color-primary) 30%, transparent), 0 12px 32px -8px color-mix(in oklab, var(--color-primary) 36%, transparent)',
  glow: '0 0 0 1px color-mix(in oklab, var(--color-primary) 28%, transparent), 0 8px 36px -6px color-mix(in oklab, var(--color-primary) 52%, transparent)',
};

export const shadowTokens = { light: lightShadows, dark: darkShadows };
export type ShadowToken = keyof ShadowTokens;
