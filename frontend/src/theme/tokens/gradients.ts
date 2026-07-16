/**
 * Gradient tokens — brand-tinted gradients for hero surfaces, loading screens,
 * empty-state backdrops and accent flourishes. They resolve from SEMANTIC color
 * variables (`--color-primary` …) so they rebrand automatically. Kept subtle —
 * gradients accent, they don't shout.
 */
export const gradients = {
  /** Primary brand sheen — buttons/CTAs on hover, hero panels. */
  brand: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
  brandSoft:
    'linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 14%, transparent) 0%, color-mix(in oklab, var(--color-accent) 12%, transparent) 100%)',
  accent: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)',
  /** App/auth background wash — barely-there depth. */
  surface:
    'radial-gradient(120% 120% at 100% 0%, color-mix(in oklab, var(--color-primary) 8%, transparent) 0%, transparent 45%), radial-gradient(120% 120% at 0% 100%, color-mix(in oklab, var(--color-accent) 8%, transparent) 0%, transparent 45%)',
  /** Glass sheen highlight (top edge of frosted surfaces). */
  glassSheen:
    'linear-gradient(180deg, color-mix(in oklab, white 8%, transparent) 0%, transparent 60%)',
  /** Skeleton shimmer sweep. */
  shimmer:
    'linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--color-foreground) 8%, transparent) 50%, transparent 100%)',
  /** Fade-to-surface mask for scroll edges / overflow. */
  fadeBottom: 'linear-gradient(180deg, transparent 0%, var(--color-surface) 100%)',
  fadeTop: 'linear-gradient(0deg, transparent 0%, var(--color-surface) 100%)',
} as const;

export type GradientToken = keyof typeof gradients;
