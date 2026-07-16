import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

import { Icon } from '@/design-system';
import { Reveal, transitions } from '@/animations';
import { cn } from '@/lib/cn';

/**
 * LoyaltyTeaser — the premium rewards banner near the end of the homepage
 * story. Pure white-label copy on the contrast-guaranteed accent pair; the
 * ordering app's Loyalty page owns all real loyalty data.
 */
export function LoyaltyTeaser({ className }: { className?: string }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  return (
    <Reveal>
      <motion.button
        type="button"
        onClick={() => navigate('/loyalty')}
        whileHover={reduced ? undefined : { y: -2 }}
        whileTap={reduced ? undefined : { scale: 0.99 }}
        transition={transitions.default}
        className={cn(
          'group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-accent p-5 text-left text-accent-foreground shadow-md sm:p-6',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className,
        )}
      >
        {/* Decorative blooms on the accent surface */}
        <span aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-accent-foreground/10 blur-2xl" />
        <span aria-hidden className="absolute -left-8 -bottom-14 h-32 w-32 rounded-full bg-accent-foreground/10 blur-2xl" />

        <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent-foreground/15">
          <Icon name="sparkles" className="h-6 w-6" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block font-display text-lg font-extrabold leading-tight sm:text-xl">
            Every order earns rewards
          </span>
          <span className="mt-0.5 block text-sm opacity-85">Collect points automatically and redeem at checkout.</span>
        </span>
        <span className="relative flex shrink-0 items-center gap-1 text-sm font-semibold">
          View rewards
          <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </motion.button>
    </Reveal>
  );
}
