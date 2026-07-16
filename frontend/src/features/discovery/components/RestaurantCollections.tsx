import { Skeleton } from '@/design-system';
import { cn } from '@/lib/cn';
import type { Branch } from '../types';
import { RestaurantCard, type RestaurantCardVariant } from './RestaurantCard';

type CollectionProps = {
  branches: Branch[];
  loading?: boolean;
  skeletonCount?: number;
  activeId?: string | null;
  onPrefetch?: (slug: string) => void;
  onOpen?: (branch: Branch) => void;
  className?: string;
};

/** Card-shaped skeleton for loading states (matches RestaurantCard footprint). */
export function RestaurantCardSkeleton({ variant = 'grid' }: { variant?: RestaurantCardVariant }) {
  const horizontal = variant === 'list' || variant === 'map';
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-surface', horizontal ? 'flex' : 'flex flex-col')}>
      <Skeleton className={cn(horizontal ? 'h-28 w-28 sm:w-36' : 'aspect-[16/10] w-full')} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

/** Responsive grid of branch cards. */
export function RestaurantGrid({ branches, loading, skeletonCount = 6, activeId, onPrefetch, onOpen, className }: CollectionProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {branches.map((b) => (
        <RestaurantCard key={b.id} branch={b} variant="grid" active={b.id === activeId} onPrefetch={onPrefetch} onOpen={onOpen} />
      ))}
      {loading && Array.from({ length: skeletonCount }).map((_, i) => <RestaurantCardSkeleton key={`s-${i}`} variant="grid" />)}
    </div>
  );
}

/** Vertical list of horizontal branch cards. */
export function RestaurantList({ branches, loading, skeletonCount = 5, activeId, onPrefetch, onOpen, className }: CollectionProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {branches.map((b) => (
        <RestaurantCard key={b.id} branch={b} variant="list" active={b.id === activeId} onPrefetch={onPrefetch} onOpen={onOpen} />
      ))}
      {loading && Array.from({ length: skeletonCount }).map((_, i) => <RestaurantCardSkeleton key={`s-${i}`} variant="list" />)}
    </div>
  );
}

/** Horizontally-scrolling rail (home sections). Each card is a fixed-width grid card. */
export function RestaurantCarousel({ branches, loading, skeletonCount = 4, onPrefetch, onOpen, className }: CollectionProps) {
  return (
    <div className={cn('-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {branches.map((b) => (
        <div key={b.id} className="w-64 shrink-0 snap-start sm:w-72">
          <RestaurantCard branch={b} variant="carousel" onPrefetch={onPrefetch} onOpen={onOpen} className="h-full" />
        </div>
      ))}
      {loading &&
        Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={`s-${i}`} className="w-64 shrink-0 sm:w-72">
            <RestaurantCardSkeleton variant="grid" />
          </div>
        ))}
    </div>
  );
}
