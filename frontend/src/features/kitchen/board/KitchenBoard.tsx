import { useMemo, useState } from 'react';

import { Spinner, EmptyState, Icon } from '@/design-system';
import { filterEntries, useKitchenQueue, useKitchenView } from '../hooks';
import { KITCHEN_COLUMNS, type KitchenEntry } from '../types';
import { ChefAssignSheet, RecallRefireDialog, type ReasonMode } from '../panels';
import { KitchenColumn } from './KitchenColumn';

const ACCENT: Record<string, string> = {
  pending: 'border-info',
  assigned: 'border-primary',
  preparing: 'border-warning',
  ready: 'border-success',
  served: 'border-border-strong',
};

/**
 * KitchenBoard — the primary KDS screen. A realtime kanban (Pending → Assigned →
 * Preparing → Ready → Served) fed by the live queue (Socket-driven, no polling) and
 * filtered client-side by the shared view store. Columns scroll independently for
 * large TVs / tablets. Recall/re-fire/cancel/assign open shared dialogs.
 */
export function KitchenBoard() {
  const queue = useKitchenQueue();
  const filters = useKitchenView();
  const [reason, setReason] = useState<{ mode: ReasonMode; entry: KitchenEntry } | null>(null);
  const [assignEntry, setAssignEntry] = useState<KitchenEntry | null>(null);

  const columns = useMemo(() => {
    const entries = filterEntries(queue.data ?? [], filters);
    return KITCHEN_COLUMNS.map((c) => ({ ...c, entries: entries.filter((e) => c.statuses.includes(e.status)) }));
  }, [queue.data, filters]);

  if (queue.isLoading) {
    return <div className="grid h-[60vh] place-items-center"><Spinner /></div>;
  }
  if (queue.isError) {
    return (
      <div className="grid h-[60vh] place-items-center p-6">
        <EmptyState icon={<Icon name="flame" className="mb-3 h-8 w-8 text-muted-foreground" />} title="Kitchen queue unavailable" description="The queue could not be loaded. Check your branch access and try again." size="sm" />
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((c) => (
          <KitchenColumn
            key={c.key}
            title={c.label}
            entries={c.entries}
            accent={ACCENT[c.key]}
            onAssign={setAssignEntry}
            onRecall={(e) => setReason({ mode: 'recall', entry: e })}
            onRefire={(e) => setReason({ mode: 'refire', entry: e })}
            onCancel={(e) => setReason({ mode: 'cancel', entry: e })}
          />
        ))}
      </div>

      <RecallRefireDialog mode={reason?.mode ?? null} entry={reason?.entry ?? null} onClose={() => setReason(null)} />
      <ChefAssignSheet entry={assignEntry} onClose={() => setAssignEntry(null)} />
    </>
  );
}
