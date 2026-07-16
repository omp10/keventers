/**
 * Reusable Framer Motion variants — the catalog of app-wide motion patterns
 * (page transitions, list stagger, overlays, drawers, hovers). Components import
 * these instead of defining ad-hoc animations, so motion feels consistent and
 * intentional everywhere. Distances/opacity are subtle by design.
 */
import type { Variants } from 'framer-motion';

import { transitions } from './transitions';

/* ── Page / route transitions ── */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitions.entrance },
  exit: { opacity: 0, y: -6, transition: transitions.exit },
};

/* ── Fade ── */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.smooth },
  exit: { opacity: 0, transition: transitions.fast },
};

/* ── Scale-in (dialogs, popovers, cards) ── */
export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: transitions.default },
  exit: { opacity: 0, scale: 0.97, transition: transitions.fast },
};

/* ── Slide-up (sheets, toasts, mobile) ── */
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: transitions.default },
  exit: { opacity: 0, y: 12, transition: transitions.fast },
};

/* ── Overlay scrim ── */
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.fast },
  exit: { opacity: 0, transition: transitions.fast },
};

/* ── Drawer (directional) ── */
export const drawerVariants = (side: 'left' | 'right' | 'top' | 'bottom'): Variants => {
  const axis = side === 'left' || side === 'right' ? 'x' : 'y';
  const sign = side === 'left' || side === 'top' ? -1 : 1;
  const closed = side === 'left' || side === 'right' ? '100%' : '100%';
  return {
    initial: { [axis]: `${sign * 100}%` } as never,
    animate: { [axis]: 0, transition: transitions.gentle } as never,
    exit: { [axis]: `${sign}` === '-1' ? `-${closed}` : closed, transition: transitions.smooth } as never,
  };
};

/* ── List stagger — parent orchestrates children ── */
export const staggerContainer = (stagger = 0.05, delayChildren = 0): Variants => ({
  initial: {},
  animate: { transition: { staggerChildren: stagger, delayChildren } },
  exit: { transition: { staggerChildren: stagger / 2, staggerDirection: -1 } },
});

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: transitions.default },
  exit: { opacity: 0, y: 6, transition: transitions.fast },
};

/* ── Interaction (hover / tap) — used via whileHover / whileTap ── */
export const interactive = {
  hover: { scale: 1.02, transition: transitions.snappy },
  tap: { scale: 0.97, transition: transitions.snappy },
};
export const interactiveSubtle = {
  hover: { scale: 1.01, transition: transitions.snappy },
  tap: { scale: 0.985, transition: transitions.snappy },
};
export const cardLift = {
  hover: { y: -4, transition: transitions.default },
  tap: { y: -1, transition: transitions.snappy },
};

/* ── Success (checkmark celebrate) — sparingly ── */
export const successPop: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: transitions.bouncy },
};
