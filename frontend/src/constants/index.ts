/**
 * App-wide constants. Presentation/config only — no secrets. Consuming apps
 * extend these; the design system stays brandable via the theme, not hardcodes.
 */
export const STORAGE_KEYS = {
  theme: 'kv-theme',
  ui: 'kv-ui',
} as const;

/** Standard breakpoint aliases mirrored from the theme (for JS logic). */
export const TOUCH_TARGET_MIN_PX = 44; // WCAG 2.5.5 minimum

export const APP = {
  /** Overridden per deployment; the brand engine owns the visible name. */
  key: 'keventers-platform',
} as const;
