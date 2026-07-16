/**
 * Named CSS keyframe animations (shimmer, pulse, spin, etc.) declared once in
 * globals.css and referenced by name here so components never inline keyframes.
 * Framer-driven motion lives in `@/animations`; this covers the CSS-only,
 * always-on loops (loading shimmer, indeterminate progress, caret blink).
 */
export const keyframes = {
  shimmer: 'kv-shimmer',
  pulse: 'kv-pulse',
  spin: 'kv-spin',
  spinReverse: 'kv-spin-reverse',
  progressIndeterminate: 'kv-progress-indeterminate',
  caret: 'kv-caret',
  ripple: 'kv-ripple',
  fadeIn: 'kv-fade-in',
  contentShow: 'kv-content-show',
  overlayShow: 'kv-overlay-show',
} as const;

export const animationPresets = {
  shimmer: `${keyframes.shimmer} 1.6s linear infinite`,
  pulse: `${keyframes.pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
  spin: `${keyframes.spin} 0.7s linear infinite`,
  progress: `${keyframes.progressIndeterminate} 1.2s ease-in-out infinite`,
  caret: `${keyframes.caret} 1s steps(1) infinite`,
} as const;

export type AnimationName = keyof typeof keyframes;
