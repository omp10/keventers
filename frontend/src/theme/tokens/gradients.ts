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

  /* ── Experience gradients — every one resolves from SEMANTIC roles, so they
        rebrand automatically. Names describe the EXPERIENCE, not the brand. ── */

  /** Customer hero — rich primary→secondary sweep with a warm accent bloom. */
  hero: 'radial-gradient(90% 120% at 85% -10%, color-mix(in oklab, var(--color-accent) 32%, transparent) 0%, transparent 55%), linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-active) 55%, var(--color-brand-secondary) 100%)',
  /** Deep premium panel — auth split, splash, admin login. */
  heroDeep:
    'radial-gradient(110% 110% at 10% 0%, color-mix(in oklab, var(--color-primary) 40%, transparent) 0%, transparent 60%), linear-gradient(160deg, var(--color-brand-secondary) 0%, color-mix(in oklab, var(--color-brand-secondary) 55%, var(--color-overlay)) 100%)',
  /** Promotional banners / offer strips — appetizing, vivid. */
  promo: 'linear-gradient(100deg, var(--color-primary) 0%, color-mix(in oklab, var(--color-primary) 55%, var(--color-accent)) 60%, var(--color-accent) 100%)',
  /** Loyalty / rewards — warm gold sheen on the accent. */
  loyalty:
    'linear-gradient(135deg, var(--color-accent) 0%, color-mix(in oklab, var(--color-accent) 65%, var(--color-warning)) 50%, color-mix(in oklab, var(--color-accent) 70%, white) 100%)',
  /** Elevated CTA (checkout, place-order) — primary with a pressed-glass depth. */
  cta: 'linear-gradient(180deg, color-mix(in oklab, var(--color-primary) 88%, white) 0%, var(--color-primary) 45%, var(--color-primary-hover) 100%)',
  /** Area-chart fill — primary fading out (pair with chart series tokens). */
  chartFill:
    'linear-gradient(180deg, color-mix(in oklab, var(--color-chart-1) 28%, transparent) 0%, transparent 100%)',
  /** Branded loading / splash backdrop — calm, deep, unmistakably on-brand. */
  loading:
    'radial-gradient(80% 80% at 50% 0%, color-mix(in oklab, var(--color-primary) 18%, transparent) 0%, transparent 60%), linear-gradient(180deg, var(--color-background) 0%, color-mix(in oklab, var(--color-brand-secondary) 10%, var(--color-background)) 100%)',
  /** QR scan/connect experience — teal signal ring feel over the brand. */
  qr: 'radial-gradient(70% 70% at 50% 30%, color-mix(in oklab, var(--color-info) 26%, transparent) 0%, transparent 65%), linear-gradient(180deg, var(--color-brand-secondary) 0%, var(--color-overlay) 100%)',
  /** Live order-tracking progress sweep. */
  tracking:
    'linear-gradient(90deg, var(--color-info) 0%, var(--color-primary) 100%)',
  /** Ops dashboard ambient wash — subtler than `surface`, stays out of the way. */
  dashboard:
    'radial-gradient(100% 60% at 100% 0%, color-mix(in oklab, var(--color-primary) 5%, transparent) 0%, transparent 50%)',
  /** Kitchen (KDS) — near-invisible depth only; operational clarity wins. */
  kitchen:
    'linear-gradient(180deg, color-mix(in oklab, var(--color-brand-secondary) 6%, transparent) 0%, transparent 30%)',
  /** Celebratory success (order placed / payment confirmed). */
  celebrate:
    'linear-gradient(135deg, var(--color-success) 0%, color-mix(in oklab, var(--color-success) 55%, var(--color-info)) 100%)',
} as const;

export type GradientToken = keyof typeof gradients;
