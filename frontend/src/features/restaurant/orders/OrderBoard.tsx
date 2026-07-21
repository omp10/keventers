import {
  Badge,
  Icon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { cn } from '@/lib/cn';
import type { OrderSummary } from '../types';
import { OrderCard } from './OrderCard';
import { OrderStatusBadge } from './OrderStatusBadge';
import { groupByBucket, waitingLabel } from './board-utils';

export type BoardView = 'list' | 'kanban' | 'compact' | 'table';

export const BOARD_VIEWS: { key: BoardView; label: string; icon: 'menu' | 'grid' | 'dashboard' | 'store' }[] = [
  { key: 'list', label: 'List', icon: 'menu' },
  { key: 'kanban', label: 'Kanban', icon: 'grid' },
  { key: 'compact', label: 'Compact', icon: 'dashboard' },
  { key: 'table', label: 'Table', icon: 'store' },
];

/** Segmented control for board views. */
export function BoardViewToggle({ view, setView, className }: { view: BoardView; setView: (v: BoardView) => void; className?: string }) {
  return (
    <div role="tablist" aria-label="Board view" className={cn('inline-flex rounded-lg border border-border bg-surface p-0.5', className)}>
      {BOARD_VIEWS.map((v) => (
        <button
          key={v.key}
          role="tab"
          aria-selected={view === v.key}
          onClick={() => setView(v.key)}
          className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition', view === v.key ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground')}
        >
          <Icon name={v.icon} className="h-4 w-4" />
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * OrderBoard — renders the SAME orders in the selected view. Switching views only
 * changes rendering; the data + business logic (actions, realtime) are identical.
 */
export function OrderBoard({ orders, view, onOpen, onBill, onAssign }: { orders: OrderSummary[]; view: BoardView; onOpen: (id: string) => void; onBill?: (id: string) => void; onAssign?: (o: OrderSummary) => void }) {
  // Position of each order within its TABLE SESSION, computed from the loaded
  // page — no extra request. A table that has ordered before gets a "Repeat"
  // flag so the kitchen knows it's a follow-up to food already sent.
  const seq = new Map<string, { index: number; total: number }>();
  const bySession = new Map<string, OrderSummary[]>();
  for (const o of orders) {
    const sid = (o as { sessionId?: string | null }).sessionId;
    if (!sid) continue;
    if (!bySession.has(sid)) bySession.set(sid, []);
    bySession.get(sid)!.push(o);
  }
  for (const group of bySession.values()) {
    const ordered = [...group].sort((a, b2) => new Date(a.createdAt).getTime() - new Date(b2.createdAt).getTime());
    ordered.forEach((o, i) => seq.set(o.id, { index: i + 1, total: ordered.length }));
  }

  if (view === 'kanban') {
    const columns = groupByBucket(orders);
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => (
          <div key={col.key} className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/40 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <Badge tone="neutral" variant="soft">{col.orders.length}</Badge>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto">
              {col.orders.map((o) => (
                <OrderCard key={o.id} order={o} onOpen={onOpen} onBill={onBill} onAssign={onAssign} sessionSeq={seq.get(o.id)} />
              ))}
              {col.orders.length === 0 && <p className="px-1 py-6 text-center text-xs text-foreground-subtle">Empty</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view === 'compact') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} onOpen={onOpen} onBill={onBill} onAssign={onAssign} sessionSeq={seq.get(o.id)} compact />
        ))}
      </div>
    );
  }

  if (view === 'table') {
    return (
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Waiting</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id} onClick={() => onOpen(o.id)} className="cursor-pointer">
                <TableCell className="font-medium">#{o.orderNumber}</TableCell>
                <TableCell>{o.customerName ?? o.tableLabel ?? 'Guest'}</TableCell>
                <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                <TableCell className="capitalize text-foreground-muted">{o.paymentStatus}</TableCell>
                <TableCell className="text-right tabular-nums">{o.itemCount}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatMoney(o.total)}</TableCell>
                <TableCell className="text-right tabular-nums text-foreground-muted">{waitingLabel(o.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // list (default)
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} onOpen={onOpen} onBill={onBill} onAssign={onAssign} sessionSeq={seq.get(o.id)} />
      ))}
    </div>
  );
}
