import { Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import { useStations } from '../hooks';
import { useKitchenView } from '../hooks';
import type { OrderPriority } from '../types';

/** Large touch-friendly search bound to the shared kitchen view store. */
export function KitchenSearch({ className }: { className?: string }) {
  const search = useKitchenView((s) => s.search);
  const patch = useKitchenView((s) => s.patch);
  return (
    <div className={cn('relative', className)}>
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-subtle" />
      <input
        type="search"
        value={search ?? ''}
        onChange={(e) => patch({ search: e.target.value || undefined })}
        placeholder="Search order #, table, station, chef…"
        className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-foreground-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

const PRIORITIES: { key: OrderPriority; label: string }[] = [
  { key: 'rush', label: 'Rush' },
  { key: 'vip', label: 'VIP' },
];

/** Station + priority filter bar bound to the shared kitchen view store. */
export function KitchenFilters({ className }: { className?: string }) {
  const stations = useStations();
  const stationId = useKitchenView((s) => s.stationId);
  const priority = useKitchenView((s) => s.priority);
  const patch = useKitchenView((s) => s.patch);
  const reset = useKitchenView((s) => s.reset);
  const hasActive = useKitchenView((s) => s.hasActive)();

  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      <Chip active={!stationId} onClick={() => patch({ stationId: undefined })}>All stations</Chip>
      {(stations.data ?? []).map((s) => (
        <Chip key={s.id} active={stationId === s.id} onClick={() => patch({ stationId: stationId === s.id ? undefined : s.id })}>
          <Icon name="flame" className="h-4 w-4" /> {s.name}
        </Chip>
      ))}
      <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />
      {PRIORITIES.map((p) => (
        <Chip key={p.key} active={priority === p.key} onClick={() => patch({ priority: priority === p.key ? undefined : p.key })}>
          {p.label}
        </Chip>
      ))}
      {hasActive && (
        <Chip onClick={reset}>
          <Icon name="close" className="h-4 w-4" /> Clear
        </Chip>
      )}
    </div>
  );
}
