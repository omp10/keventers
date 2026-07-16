/**
 * Motion tokens — the single source of truth for ALL animation timing. Framer
 * Motion variants + CSS transitions both read from here, so the product's motion
 * "signature" (snappy vs. gentle) is one config away. Values chosen for a
 * premium, physical feel (Linear/Arc): fast, spring-based, never bouncy-for-fun.
 */

/** Durations in seconds (Framer) — CSS gets ms via the resolver. */
export const duration = {
  instant: 0.05,
  fast: 0.12,
  quick: 0.18,
  base: 0.24,
  slow: 0.36,
  slower: 0.5,
  slowest: 0.8,
} as const;
export type DurationToken = keyof typeof duration;

/** Cubic-bézier easings. `standard` for most, `emphasized` for entrances. */
export const easing = {
  standard: [0.2, 0, 0, 1], // ease-out-ish, decisive
  emphasized: [0.16, 1, 0.3, 1], // expo-out — luxurious entrances
  emphasizedIn: [0.7, 0, 0.84, 0],
  entrance: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  linear: [0, 0, 1, 1],
  anticipate: [0.36, 0, 0.66, -0.56],
} as const;
export type EasingToken = keyof typeof easing;

/** As CSS `cubic-bezier(...)` strings (for non-Framer transitions). */
export const easingCss = Object.fromEntries(
  Object.entries(easing).map(([k, v]) => [k, `cubic-bezier(${v.join(', ')})`]),
) as Record<EasingToken, string>;

/** Framer spring presets — the heart of the "physical" feel. */
export const spring = {
  /** Default UI spring: crisp, minimal overshoot. */
  default: { type: 'spring', stiffness: 400, damping: 34, mass: 0.9 },
  /** Snappy: toggles, taps. */
  snappy: { type: 'spring', stiffness: 600, damping: 32, mass: 0.7 },
  /** Gentle: drawers, large surfaces. */
  gentle: { type: 'spring', stiffness: 240, damping: 30, mass: 1 },
  /** Bouncy: success / celebratory only (use sparingly). */
  bouncy: { type: 'spring', stiffness: 500, damping: 18, mass: 0.8 },
  /** Lively: playful-premium signature — a wink of overshoot, never cartoonish. */
  lively: { type: 'spring', stiffness: 460, damping: 27, mass: 0.85 },
  /** Smooth non-spring tween for opacity/color. */
  smooth: { type: 'tween', duration: duration.base, ease: easing.standard },
} as const;
export type SpringToken = keyof typeof spring;

/** Interaction scale tokens — consistent press/hover feedback everywhere. */
export const interaction = {
  hoverScale: 1.02,
  hoverScaleSm: 1.01,
  tapScale: 0.97,
  tapScaleSm: 0.985,
  cardLift: -4, // translateY on hover (px)
  pressLift: 0,
} as const;

export const motion = { duration, easing, easingCss, spring, interaction };
