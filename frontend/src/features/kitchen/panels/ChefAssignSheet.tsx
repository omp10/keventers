import { useEffect, useMemo, useState } from 'react';

import { Button, Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, Icon, Progress } from '@/design-system';
import { cn } from '@/lib/cn';
import { useChefs, useKitchenActions, useStations } from '../hooks';
import type { KitchenEntry } from '../types';

/**
 * Everything this sheet actually needs. Widened from KitchenEntry so the ORDERS
 * page can assign too — it holds order summaries, not kitchen queue entries, and
 * assignment is keyed on the order id either way.
 */
export type AssignTarget = Pick<KitchenEntry, 'orderId' | 'orderNumber'> &
  Partial<Pick<KitchenEntry, 'station' | 'chef'>>;

/**
 * ChefAssignSheet — assign/reassign an order to a station + chef, or Auto-assign
 * (the backend decides via its assignment strategy). Shows chef workload + queue
 * position from the backend; the frontend only picks and posts.
 */
export function ChefAssignSheet({ entry, onClose }: { entry: AssignTarget | null; onClose: () => void }) {
  const stations = useStations();
  const chefs = useChefs();
  const actions = useKitchenActions();
  const [stationId, setStationId] = useState<string | undefined>();
  const [chefId, setChefId] = useState<string | undefined>();
  const open = Boolean(entry);

  useEffect(() => {
    if (entry) {
      setStationId(entry.station?.id);
      setChefId(entry.chef?.id);
    }
  }, [entry?.orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stationChefs = useMemo(
    () => (chefs.data ?? []).filter((c) => !stationId || c.stationId === stationId),
    [chefs.data, stationId],
  );

  if (!entry) return null;

  const assign = async (auto?: boolean) => {
    await actions.assign(entry.orderId, auto ? {} : { stationId, chefId });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Assign · #{entry.orderNumber}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {/* Stations */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Station</p>
            <div className="flex flex-wrap gap-2">
              {(stations.data ?? []).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStationId(s.id)}
                  className={cn('rounded-xl border px-3 py-2 text-sm font-medium transition', stationId === s.id ? 'border-primary bg-primary-soft text-primary' : 'border-border text-foreground-muted hover:text-foreground')}
                >
                  <span className="inline-flex items-center gap-1.5"><Icon name="flame" className="h-4 w-4" /> {s.name}</span>
                  {s.capacity != null && <span className="ml-2 text-xs text-foreground-subtle">{s.load ?? 0}/{s.capacity}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Chefs */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Chef</p>
            <div className="space-y-2">
              {stationChefs.length === 0 && <p className="text-sm text-foreground-subtle">No chefs for this station.</p>}
              {stationChefs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChefId(c.id)}
                  className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', chefId === c.id ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-border-strong')}
                >
                  <Icon name="user" className="h-5 w-5 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{c.name}</span>
                    {c.activeCount != null && <span className="block text-xs text-foreground-muted">{c.activeCount} active</span>}
                  </span>
                  {c.workload != null && <Progress value={Math.round(c.workload * 100)} size="sm" className="w-20" />}
                </button>
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" leftIcon="refresh" loading={actions.isPending} onClick={() => void assign(true)}>Auto-assign</Button>
          <Button loading={actions.isPending} disabled={!stationId && !chefId} onClick={() => void assign(false)}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
