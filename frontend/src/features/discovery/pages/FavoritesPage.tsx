import { EmptyState, Icon } from '@/design-system';
import { RestaurantGrid } from '../components';
import { useFavoriteBranches, useRecentBranches } from '../favorites';
import { usePrefetchBranch } from '../hooks';

/** /favorites — saved + recently visited branches (hydrated from local snapshots). */
export function FavoritesPage() {
  const favorites = useFavoriteBranches();
  const recent = useRecentBranches(12);
  const prefetch = usePrefetchBranch();

  const empty = favorites.length === 0 && recent.length === 0;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-foreground">Saved</h1>

      {empty && (
        <EmptyState
          icon={<Icon name="star" className="mb-3 h-8 w-8 text-muted-foreground" />}
          title="Nothing saved yet"
          description="Tap the star on any restaurant to save it here for quick access."
          size="sm"
        />
      )}

      {favorites.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Icon name="star" className="h-4 w-4 text-primary" /> Favorites
          </h2>
          <RestaurantGrid branches={favorites} onPrefetch={prefetch} />
        </section>
      )}

      {recent.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Icon name="clock" className="h-4 w-4 text-primary" /> Recently visited
          </h2>
          <RestaurantGrid branches={recent} onPrefetch={prefetch} />
        </section>
      )}
    </div>
  );
}
