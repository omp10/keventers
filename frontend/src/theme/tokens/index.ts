/**
 * Design-token barrel — the entire visual language in one import. Anything with a
 * visual value (color, size, motion, z-order) lives behind these tokens; no
 * component ever hardcodes a raw value. Two layers: PRIMITIVE (palette) →
 * SEMANTIC (colors/elevation), plus the scale tokens (spacing/radius/type/…).
 */
export * from './palette';
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './radius';
export * from './shadows';
export * from './elevation';
export * from './motion';
export * from './animations';
export * from './layout';
export * from './breakpoints';
export * from './zIndex';
export * from './opacity';
export * from './blur';
export * from './gradients';

import { colorTokens } from './colors';
import { shadowTokens } from './shadows';
import { typography } from './typography';
import { spacing, density } from './spacing';
import { radius, radiusScale } from './radius';
import { elevation } from './elevation';
import { motion } from './motion';
import { animationPresets, keyframes } from './animations';
import { layout } from './layout';
import { breakpoints } from './breakpoints';
import { zIndex } from './zIndex';
import { opacity } from './opacity';
import { blur } from './blur';
import { gradients } from './gradients';

/** The complete, immutable token set. */
export const tokens = {
  colors: colorTokens,
  shadows: shadowTokens,
  typography,
  spacing,
  density,
  radius,
  radiusScale,
  elevation,
  motion,
  animations: { presets: animationPresets, keyframes },
  layout,
  breakpoints,
  zIndex,
  opacity,
  blur,
  gradients,
} as const;

export type Tokens = typeof tokens;
