/**
 * Deterministic integer rounding helpers for money math. All monetary values in
 * the platform are integer MINOR units (e.g. paise), so these operate on numbers
 * that may be fractional only transiently (mid-calculation) and always return an
 * integer. Never use floating-point money elsewhere.
 */

/** Round half away from zero (standard commercial rounding). */
export function roundHalfUp(value) {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Round toward zero (truncate). */
export function roundDown(value) {
  return Math.trunc(value);
}

/** Round to the nearest multiple of `step` minor units (e.g. nearest rupee = 100). */
export function roundToNearest(value, step) {
  if (!step || step <= 1) return roundHalfUp(value);
  return Math.round(value / step) * step;
}

/** Round UP to the nearest multiple of `step` minor units. */
export function roundUpToNearest(value, step) {
  if (!step || step <= 1) return Math.ceil(value);
  return Math.ceil(value / step) * step;
}

export const RoundingMode = Object.freeze({
  HALF_UP: 'half_up',
  DOWN: 'down',
  NEAREST: 'nearest',
  UP: 'up',
});
