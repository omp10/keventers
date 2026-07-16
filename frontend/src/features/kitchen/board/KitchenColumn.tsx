import { Badge } from '@/design-system';
import { cn } from '@/lib/cn';
import { KitchenOrderCard } from '../components';
import type { KitchenEntry } from '../types';

/**
 * KitchenColumn — one kanban column (Pending/Assigned/Preparing/Ready/Served). Its
 * own scroll area so long queues never push other columns. Same data + card across
 * columns; only membership differs.
 */
export function KitchenColumn({
  title,
  entries,
  onAssign,
  onRecall,
  onRefire,
  onCancel,
  accent,
}: {
  title: string;
  entries: KitchenEntry[];
  onAssign: (e: KitchenEntry) => void;
  onRecall: (e: KitchenEntry) => void;
  onRefire: (e: KitchenEntry) => void;
  onCancel: (e: KitchenEntry) => void;
  accent?: string;
}) {
  return (
    <section className="flex min-w-[300px] flex-1 flex-col rounded-2xl bg-muted/40" aria-label={`${title} column`}>
      <header className={cn('sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b-2 bg-background/95 px-4 py-3 backdrop-blur', accent ?? 'border-border')}>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <Badge tone="neutral" variant="solid" className="text-sm">{entries.length}</Badge>
      </header>
      <div className="flex flex-col gap-3 overflow-y-auto p-3">
        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-foreground-subtle">No orders</p>
        ) : (
          entries.map((e) => (
            <KitchenOrderCard key={e.id} entry={e} onAssign={onAssign} onRecall={onRecall} onRefire={onRefire} onCancel={onCancel} />
          ))
        )}
      </div>
    </section>
  );
}
