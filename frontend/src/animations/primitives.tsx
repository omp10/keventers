import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

import {
  fadeVariants,
  pageVariants,
  revealVariants,
  scaleVariants,
  slideUpVariants,
  staggerContainer,
  staggerItem,
} from './variants';

/**
 * Motion PRIMITIVES — drop-in animated wrappers so feature code never wires
 * variants manually. Each honors `prefers-reduced-motion` (renders statically
 * when reduced), satisfying the accessibility requirement automatically.
 */

type BaseProps = HTMLMotionProps<'div'> & { children?: ReactNode };

function useVariants<T>(animated: T, reduced: T): T {
  return useReducedMotion() ? reduced : animated;
}

const STATIC = { initial: {}, animate: {}, exit: {} };

export function FadeIn({ children, ...props }: BaseProps) {
  return (
    <motion.div variants={useVariants(fadeVariants, STATIC)} initial="initial" animate="animate" exit="exit" {...props}>
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, ...props }: BaseProps) {
  return (
    <motion.div variants={useVariants(scaleVariants, STATIC)} initial="initial" animate="animate" exit="exit" {...props}>
      {children}
    </motion.div>
  );
}

export function SlideUp({ children, ...props }: BaseProps) {
  return (
    <motion.div variants={useVariants(slideUpVariants, STATIC)} initial="initial" animate="animate" exit="exit" {...props}>
      {children}
    </motion.div>
  );
}

/** Wrap a routed view for a consistent page transition. */
export function PageTransition({ children, ...props }: BaseProps) {
  return (
    <motion.div variants={useVariants(pageVariants, STATIC)} initial="initial" animate="animate" exit="exit" {...props}>
      {children}
    </motion.div>
  );
}

/** Viewport threshold shared by scroll reveals — starts slightly before entry. */
const REVEAL_VIEWPORT = { once: true, margin: '0px 0px -10% 0px' } as const;

/**
 * Reveal — fade-up ONCE as the element scrolls into view (scroll storytelling).
 * Below-the-fold sections wrap in this so attention is guided section by section.
 * Renders statically under reduced motion.
 */
export function Reveal({ children, delay = 0, ...props }: BaseProps & { delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? STATIC : revealVariants}
      initial="initial"
      whileInView="animate"
      viewport={REVEAL_VIEWPORT}
      transition={delay ? { delay } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * RevealStagger — staggers its <Stagger.Item> children when scrolled into view
 * (card rows, chip groups). One-shot; reduced-motion renders statically.
 */
export function RevealStagger({ children, stagger = 0.06, delay = 0, ...props }: BaseProps & { stagger?: number; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? STATIC : staggerContainer(stagger, delay)}
      initial="initial"
      whileInView="animate"
      viewport={REVEAL_VIEWPORT}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Orchestrates a staggered reveal of its <Stagger.Item> children. */
export function Stagger({ children, stagger = 0.05, delay = 0, ...props }: BaseProps & { stagger?: number; delay?: number }) {
  return (
    <motion.div variants={useVariants(staggerContainer(stagger, delay), STATIC)} initial="initial" animate="animate" exit="exit" {...props}>
      {children}
    </motion.div>
  );
}

Stagger.Item = function StaggerItemCmp({ children, ...props }: BaseProps) {
  return (
    <motion.div variants={useVariants(staggerItem, STATIC)} {...props}>
      {children}
    </motion.div>
  );
};
