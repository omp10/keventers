import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

import { fadeVariants, pageVariants, scaleVariants, slideUpVariants, staggerContainer, staggerItem } from './variants';

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
