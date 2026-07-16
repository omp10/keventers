import { Badge, Button, Card, Icon, Progress, Spinner, EmptyState, toast } from '@/design-system';
import { queryClient, useMutationResource } from '@/platform/query';
import { cn } from '@/lib/cn';
import { kitchenService } from '../services';
import { KK, useChefs, useStations } from '../hooks';
import type { KitchenStation, StationStatus } from '../types';

const STATUS_TONE: Record<StationStatus, 'success' | 'warning' | 'neutral'> = { open: 'success', busy: 'warning', closed: 'neutral' };
const NEXT: Record<StationStatus, StationStatus> = { open: 'busy', busy: 'closed', closed: 'open' };

/**
 * StationManagement — kitchen stations + chef workload. Shows station status,
 * capacity/load, routing preview (categories a station handles), and each chef's
 * workload. Station routing + capacity are backend-owned; this reflects and lets a
 * manager set station status. Touch-friendly.
 */
export function StationManagement() {
  const stations = useStations();
  const chefs = useChefs();

  const statusM = useMutationResource<KitchenStation, { id: string; status: StationStatus }>(
    ({ id, status }) => kitchenService.setStationStatus(id, status),
    { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: KK.stations() }); toast.success('Station updated'); }, onError: (e) => toast.error('Update failed', { description: (e as Error).message }) },
  );

  if (stations.isLoading) return <div className="grid h-[50vh] place-items-center"><Spinner /></div>;

  const list = stations.data ?? [];
  const chefList = chefs.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Stations</h1>

      {list.length === 0 ? (
        <EmptyState icon={<Icon name="flame" className="mb-3 h-8 w-8 text-muted-foreground" />} title="No stations" description="Kitchen stations will appear here." size="sm" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => {
            const loadPct = s.capacity ? Math.round(((s.load ?? 0) / s.capacity) * 100) : 0;
            return (
              <Card key={s.id} padding="md" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                    <Icon name="flame" className="h-5 w-5 text-primary" /> {s.name}
                  </h3>
                  <Badge tone={STATUS_TONE[s.status]} variant="soft" className="capitalize">{s.status}</Badge>
                </div>

                {s.capacity != null && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-foreground-muted">
                      <span>Load</span>
                      <span className="font-medium tabular-nums">{s.load ?? 0}/{s.capacity}</span>
                    </div>
                    <Progress value={loadPct} size="md" tone={loadPct >= 90 ? 'danger' : loadPct >= 70 ? 'warning' : 'primary'} />
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <Icon name="user" className="h-4 w-4" /> {s.chefIds?.length ?? 0} chef{(s.chefIds?.length ?? 0) === 1 ? '' : 's'}
                </div>

                {s.categoryNames && s.categoryNames.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-foreground-subtle">Routes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.categoryNames.map((c) => <Badge key={c} tone="neutral" variant="soft">{c}</Badge>)}
                    </div>
                  </div>
                )}

                <Button variant="secondary" fullWidth leftIcon="refresh" loading={statusM.isPending} onClick={() => statusM.mutate({ id: s.id, status: NEXT[s.status] })}>
                  Set {NEXT[s.status]}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Chef workload */}
      <section>
        <h2 className="mb-2 text-lg font-bold text-foreground">Chefs</h2>
        {chefList.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-foreground-muted">No chefs on shift.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {chefList.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="user" className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-foreground-muted">{c.stationName ?? 'Unassigned'} · {c.activeCount ?? 0} active</p>
                </div>
                {c.workload != null && <div className={cn('text-sm font-bold', c.workload >= 0.85 ? 'text-danger' : c.workload >= 0.6 ? 'text-warning' : 'text-success')}>{Math.round(c.workload * 100)}%</div>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
