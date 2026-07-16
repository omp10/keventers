import { Button } from '@/design-system';
import { cn } from '@/lib/cn';
import { SERVICE_MODE_LABELS, SERVICE_MODE_ICONS } from '../components/format';
import type { DiscoveryFilterState, DiscoverySort, ServiceMode } from '../types';
import { FilterChip } from './FilterChip';

const SORTS: { key: DiscoverySort; label: string }[] = [
  { key: 'nearest', label: 'Nearest' },
  { key: 'rating', label: 'Top rated' },
  { key: 'popular', label: 'Popular' },
  { key: 'newest', label: 'Newest' },
];
const RADII = [1, 3, 5, 10];
const SERVICE_MODES: ServiceMode[] = ['dine_in', 'takeaway', 'delivery', 'drive_thru', 'curbside'];

/**
 * DiscoveryFilters — a chip-based, horizontally-scrollable filter/sort bar wired to
 * the controller's filter state. New filters (offers, price, reservations…) plug in
 * as more chips without touching consumers. The frontend only expresses intent; the
 * backend applies filtering + serviceability.
 */
export function DiscoveryFilters({
  filters,
  patch,
  reset,
  cuisines,
  className,
}: {
  filters: DiscoveryFilterState;
  patch: (p: Partial<DiscoveryFilterState>) => void;
  reset: () => void;
  /** Facet cuisines surfaced by the backend for this result set. */
  cuisines?: string[];
  className?: string;
}) {
  const toggleService = (mode: ServiceMode) => {
    const set = new Set(filters.services ?? []);
    set.has(mode) ? set.delete(mode) : set.add(mode);
    patch({ services: set.size ? [...set] : undefined });
  };
  const toggleCuisine = (c: string) => {
    const set = new Set(filters.cuisines ?? []);
    set.has(c) ? set.delete(c) : set.add(c);
    patch({ cuisines: set.size ? [...set] : undefined });
  };

  const hasActive =
    filters.openNow || filters.minRating || filters.radiusKm || filters.services?.length || filters.cuisines?.length || (filters.sort && filters.sort !== 'nearest');

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Primary row: sort */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SORTS.map((s) => (
          <FilterChip key={s.key} active={filters.sort === s.key} onClick={() => patch({ sort: s.key })}>
            {s.label}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        <FilterChip active={filters.openNow} icon="clock" onClick={() => patch({ openNow: !filters.openNow || undefined })}>
          Open now
        </FilterChip>
        <FilterChip active={filters.minRating === 4} icon="star" onClick={() => patch({ minRating: filters.minRating === 4 ? undefined : 4 })}>
          4.0+
        </FilterChip>
        <FilterChip active={filters.minRating === 4.5} icon="star" onClick={() => patch({ minRating: filters.minRating === 4.5 ? undefined : 4.5 })}>
          4.5+
        </FilterChip>
      </div>

      {/* Secondary row: service modes + distance */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SERVICE_MODES.map((m) => (
          <FilterChip key={m} active={filters.services?.includes(m)} icon={SERVICE_MODE_ICONS[m]} onClick={() => toggleService(m)}>
            {SERVICE_MODE_LABELS[m]}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        {RADII.map((r) => (
          <FilterChip key={r} active={filters.radiusKm === r} icon="truck" onClick={() => patch({ radiusKm: filters.radiusKm === r ? undefined : r })}>
            {r} km
          </FilterChip>
        ))}
      </div>

      {/* Cuisine facets (backend-provided) */}
      {cuisines && cuisines.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cuisines.map((c) => (
            <FilterChip key={c} active={filters.cuisines?.includes(c)} icon="utensils" onClick={() => toggleCuisine(c)}>
              {c}
            </FilterChip>
          ))}
        </div>
      )}

      {hasActive && (
        <div>
          <Button variant="ghost" size="sm" leftIcon="close" onClick={reset}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
