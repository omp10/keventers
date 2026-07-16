import { EmptyState, Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import type { DiscoveryViewMode } from '../hooks';
import type { Branch, GeoPoint } from '../types';
import { RestaurantList } from './RestaurantCollections';
import { RestaurantMap } from './RestaurantMap';
import { InfiniteSentinel } from './InfiniteSentinel';

const VIEWS: { key: DiscoveryViewMode; label: string; icon: 'menu' | 'store' | 'grid' }[] = [
  { key: 'list', label: 'List', icon: 'menu' },
  { key: 'map', label: 'Map', icon: 'store' },
  { key: 'split', label: 'Split', icon: 'grid' },
];

/** Segmented control for switching list / map / split. */
export function ViewToggle({
  view,
  setView,
  allowSplit = true,
  className,
}: {
  view: DiscoveryViewMode;
  setView: (v: DiscoveryViewMode) => void;
  allowSplit?: boolean;
  className?: string;
}) {
  const views = allowSplit ? VIEWS : VIEWS.filter((v) => v.key !== 'split');
  return (
    <div role="tablist" aria-label="Result view" className={cn('inline-flex rounded-lg border border-border bg-surface p-0.5', className)}>
      {views.map((v) => (
        <button
          key={v.key}
          role="tab"
          aria-selected={view === v.key}
          onClick={() => setView(v.key)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
            view === v.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground-muted hover:text-foreground',
          )}
        >
          <Icon name={v.icon} className="h-4 w-4" />
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}

export type DiscoveryResultsProps = {
  branches: Branch[];
  view: DiscoveryViewMode;
  loading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  activeBranchId: string | null;
  setActiveBranchId: (id: string | null) => void;
  origin?: GeoPoint | null;
  onPrefetch?: (slug: string) => void;
  onOpen?: (branch: Branch) => void;
  emptyTitle?: string;
  emptyDescription?: string;
};

/**
 * DiscoveryResults — renders the current view (list | map | split) from ONE data
 * source. List and map share the same `branches`; there is no duplicated fetching
 * or rendering logic. Infinite scroll drives pagination in list/split.
 */
export function DiscoveryResults(props: DiscoveryResultsProps) {
  const { branches, view, loading, hasNextPage, isFetchingNextPage, fetchNextPage, activeBranchId, setActiveBranchId, origin, onPrefetch, onOpen } = props;

  const isEmpty = !loading && branches.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon={<Icon name="search" className="mb-3 h-8 w-8 text-muted-foreground" />}
        title={props.emptyTitle ?? 'No places found'}
        description={props.emptyDescription ?? 'Try widening your search, changing filters, or a different area.'}
        size="sm"
      />
    );
  }

  const listColumn = (
    <div>
      <RestaurantList branches={branches} loading={loading} activeId={activeBranchId} onPrefetch={onPrefetch} onOpen={onOpen} />
      <InfiniteSentinel hasMore={hasNextPage} loading={isFetchingNextPage} onLoadMore={fetchNextPage} />
    </div>
  );

  if (view === 'map') {
    return (
      <RestaurantMap
        branches={branches}
        activeId={activeBranchId}
        origin={origin}
        onActive={setActiveBranchId}
        onPrefetch={onPrefetch}
        onOpen={onOpen}
        className="h-[70vh] overflow-hidden rounded-2xl"
      />
    );
  }

  if (view === 'split') {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="max-h-[80vh] overflow-y-auto pr-1">{listColumn}</div>
        <div className="sticky top-4 hidden h-[80vh] lg:block">
          <RestaurantMap
            branches={branches}
            activeId={activeBranchId}
            origin={origin}
            onActive={setActiveBranchId}
            onPrefetch={onPrefetch}
            onOpen={onOpen}
            className="h-full overflow-hidden rounded-2xl"
          />
        </div>
      </div>
    );
  }

  return listColumn;
}
