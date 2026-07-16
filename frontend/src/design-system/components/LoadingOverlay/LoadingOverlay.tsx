import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Spinner } from '@/design-system/components/Spinner';

export type LoadingOverlayProps = {
  /** When true, a blurred scrim + spinner covers the relative parent. */
  loading: boolean;
  label?: ReactNode;
  /** 'absolute' covers the nearest positioned ancestor; 'fixed' covers the viewport. */
  variant?: 'absolute' | 'fixed';
  spinnerSize?: 'md' | 'lg' | 'xl';
  className?: string;
};

/**
 * LoadingOverlay — a blocking, blurred loading scrim for async regions/pages.
 * Fades in/out with Framer and honors reduced-motion. Place inside a `relative`
 * container (absolute) or at the root (fixed).
 */
export function LoadingOverlay({ loading, label, variant = 'absolute', spinnerSize = 'lg', className }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'z-[1100] grid place-items-center bg-[var(--kv-glass-bg)] backdrop-blur-[3px]',
            variant === 'fixed' ? 'fixed inset-0' : 'absolute inset-0 rounded-[inherit]',
            className,
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3">
            <Spinner size={spinnerSize} />
            {label && <p className="text-sm font-medium text-foreground-muted">{label}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
