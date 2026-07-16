import { Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import { useFavorite } from '../favorites';
import type { Branch } from '../types';

/**
 * FavoriteButton — reusable heart toggle wired to the Favorites store. Stops event
 * propagation so it works when overlaid on a clickable card. Theme-driven.
 */
export function FavoriteButton({ branch, className }: { branch: Branch; className?: string }) {
  const { isFavorite, toggle } = useFavorite(branch);
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remove ${branch.name} from favorites` : `Add ${branch.name} to favorites`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-full bg-surface/80 text-foreground-muted backdrop-blur transition hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isFavorite && 'text-danger',
        className,
      )}
    >
      <Icon name={isFavorite ? 'star' : 'star'} className={cn('h-4 w-4', isFavorite && 'fill-current')} />
    </button>
  );
}
