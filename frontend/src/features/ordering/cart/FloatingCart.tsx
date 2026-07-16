import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { Icon } from '@/design-system';
import { transitions } from '@/animations';
import { gradients } from '@/theme';
import { cn } from '@/lib/cn';
import { useOnlineStatus } from '@/platform/offline';
import { formatMoney } from '../format';
import type { Money } from '../types';

/**
 * FloatingCart — the persistent bottom bar shown whenever the cart has items. It's
 * a reusable summary + CTA; the page decides where "View cart" goes. Surfaces
 * offline state (the cart still works — mutations queue via the Offline Platform).
 *
 * Motion: springs in from the bottom on first item, the count badge pops on every
 * change, and the total cross-fades — all transform/opacity, reduced-motion safe.
 */
export function FloatingCart({
  itemCount,
  total,
  onClick,
  className,
}: {
  itemCount: number;
  total?: Money;
  onClick: () => void;
  className?: string;
}) {
  const online = useOnlineStatus();
  const reduced = useReducedMotion();
  const totalLabel = total ? formatMoney(total) : null;

  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.div
          initial={reduced ? false : { y: 96, opacity: 0 }}
          animate={reduced ? undefined : { y: 0, opacity: 1 }}
          exit={reduced ? undefined : { y: 96, opacity: 0, transition: transitions.exit }}
          transition={transitions.gentle}
          className={cn('fixed inset-x-0 bottom-0 z-40 p-3', className)}
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <motion.button
            type="button"
            onClick={onClick}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            transition={transitions.snappy}
            className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundImage: gradients.cta }}
          >
            <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-primary-foreground/15">
              <Icon name="cart" className="h-5 w-5" />
              {/* Count badge — pops on every quantity change (keyed remount). */}
              <motion.span
                key={itemCount}
                initial={reduced ? false : { scale: 0.5 }}
                animate={reduced ? undefined : { scale: 1 }}
                transition={transitions.bouncy}
                className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-foreground px-1 text-[0.6875rem] font-bold text-primary"
                aria-hidden
              >
                {itemCount}
              </motion.span>
            </span>
            <span className="flex-1 text-left">
              <span className="block text-sm font-semibold">
                {itemCount} item{itemCount === 1 ? '' : 's'}
                {!online && <span className="ml-2 text-xs font-normal opacity-80">· offline</span>}
              </span>
              {/* Total — cross-fades between values as pricing updates. */}
              {totalLabel && (
                <span className="block h-4 overflow-hidden text-xs opacity-80">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={totalLabel}
                      initial={reduced ? false : { y: 10, opacity: 0 }}
                      animate={reduced ? undefined : { y: 0, opacity: 1 }}
                      exit={reduced ? undefined : { y: -10, opacity: 0 }}
                      transition={transitions.snappy}
                      className="block"
                    >
                      {totalLabel}
                    </motion.span>
                  </AnimatePresence>
                </span>
              )}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold">
              View cart <Icon name="chevronRight" className="h-4 w-4" />
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
