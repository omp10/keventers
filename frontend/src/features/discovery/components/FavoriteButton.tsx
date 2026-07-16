import { motion, useReducedMotion } from 'framer-motion';

import { Icon } from '@/design-system';
import { transitions } from '@/animations';
import { cn } from '@/lib/cn';
import { useFavorite } from '../favorites';
import type { Branch } from '../types';

/**
 * FavoriteButton — reusable heart toggle wired to the Favorites store. Stops event
 * propagation so it works when overlaid on a clickable card. The heart pops with a
 * celebratory spring when favorited (static under reduced motion). Theme-driven.
 */
export function FavoriteButton({ branch, className }: { branch: Branch; className?: string }) {
  const { isFavorite, toggle } = useFavorite(branch);
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remove ${branch.name} from favorites` : `Add ${branch.name} to favorites`}
      whileTap={reduced ? undefined : { scale: 0.85 }}
      transition={transitions.snappy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-full bg-surface/80 text-foreground-muted backdrop-blur transition-colors hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isFavorite && 'text-danger',
        className,
      )}
    >
      {/* Keyed remount pops the heart on each toggle-on. */}
      <motion.span
        key={isFavorite ? 'on' : 'off'}
        initial={reduced ? undefined : { scale: isFavorite ? 0.4 : 1 }}
        animate={reduced ? undefined : { scale: 1 }}
        transition={transitions.bouncy}
        className="grid place-items-center"
      >
        <Icon name="heart" className={cn('h-4 w-4', isFavorite && 'fill-current')} />
      </motion.span>
    </motion.button>
  );
}
