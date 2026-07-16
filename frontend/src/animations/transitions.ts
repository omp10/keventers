/**
 * Framer Motion transition presets — thin wrappers over the MOTION TOKENS so no
 * component hand-writes stiffness/duration numbers. Change the motion signature
 * in tokens/motion.ts and every animation across the app updates.
 */
import type { Transition } from 'framer-motion';

import { motion as m } from '@/theme';

export const transitions = {
  default: m.spring.default as Transition,
  snappy: m.spring.snappy as Transition,
  gentle: m.spring.gentle as Transition,
  bouncy: m.spring.bouncy as Transition,
  smooth: { type: 'tween', duration: m.duration.base, ease: m.easing.standard } as Transition,
  fast: { type: 'tween', duration: m.duration.quick, ease: m.easing.standard } as Transition,
  entrance: { type: 'tween', duration: m.duration.slow, ease: m.easing.emphasized } as Transition,
  exit: { type: 'tween', duration: m.duration.quick, ease: m.easing.exit } as Transition,
} as const;

export type TransitionName = keyof typeof transitions;
