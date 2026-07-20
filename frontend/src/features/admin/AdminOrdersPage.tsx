import { useEffect, useState } from 'react';

import { Badge, Button, Icon, Input } from '@/design-system';
import { ExportButton, ManagementPage, ManagementTable, StatusPill, type Column, type StatusTone } from '@/features/management/components';
import { formatMoney } from '@/features/ordering/format';
import { qk, usePaginatedResource } from '@/platform/query';
import { adminService } from './admin.service';
import { AdminOrderDetailDrawer } from './AdminOrderDetailDrawer';
import type { PlatformOrder } from './types';

/**
 * Status groups for the tracking dropdown. "Live" is the default because the
 * reason to open this page is almost always "what is happening right now" —
 * finished orders are history and only crowd that view.
 */
const LIVE_STATUSES = ['placed', 'confirmed', 'preparing', 'ready'];
const FILTERS = [
  { value: 'live', label: 'Live orders' },
  { value: '', label: 'All statuses' },
  { value: 'placed', label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'served', label: 'Served' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const TONE: Record<string, StatusTone> = {
  placed: 'warning', confirmed: 'info', preparing: 'info', ready: 'success',
  served: 'success', completed: 'success', cancelled: 'danger', refunded: 'danger',
};

/** "3m ago" — a live board needs elapsed time, not a wall-clock timestamp. */
function ago(iso?: string): string {
  if (!iso) return '—';
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86_400)}d ago`;
}

/**
 * ADMIN ORDERS — every order on the platform, across all restaurants, with live
 * status.
 *
 * Optimisation notes: the backend pages server-side (indexed on
 * `{status, createdAt}`) and batches outlet names two queries per page, so this
 * never grows with row count. Polling only runs while the tab is visible and
 * only for LIVE views — a finished-orders list has nothing to refresh — and
 * `placeholderData` keeps the previous page on screen so a refresh never blanks
 * the table or loses scroll position.
 */
export function AdminOrdersPage() {
  const [status, setStatus] = useState<string>('live');
  /** Which order the forensic drawer is showing. */
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const isLive = status === 'live' || LIVE_STATUSES.includes(status);

  // Debounce the search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Pause polling when the tab is hidden: an admin leaves this open all day and
  // a background tab hammering the API buys nothing.
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const q = usePaginatedResource<PlatformOrder>(
    qk('admin', 'orders', status, term),
    (p, l) => adminService.orders({ status: status === 'live' ? undefined : status || undefined, search: term || undefined }, p, l),
    { limit: 25, refetchInterval: isLive && visible ? 10_000 : false },
  );

  // "Live" spans several statuses; the API filters one at a time, so narrow the
  // page client-side for that one case.
  const rows = status === 'live' ? q.items.filter((o) => LIVE_STATUSES.includes(o.status)) : q.items;

  const columns: Column<PlatformOrder>[] = [
    { key: 'order', header: 'Order', render: (o) => <span className="font-medium">#{o.orderNumber}</span> },
    {
      key: 'outlet',
      header: 'Restaurant',
      render: (o) => (
        <div className="leading-tight">
          <div>{o.restaurant?.name ?? '—'}</div>
          {o.branch?.name && <div className="text-xs text-foreground-muted">{o.branch.name}</div>}
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (o) => <Badge variant="soft">{o.orderType ?? '—'}</Badge> },
    { key: 'status', header: 'Status', render: (o) => <StatusPill tone={TONE[o.status] ?? 'neutral'}>{o.status}</StatusPill> },
    { key: 'total', header: 'Total', align: 'right', render: (o) => formatMoney(o.pricing?.total ?? o.total) },
    { key: 'age', header: 'Placed', align: 'right', render: (o) => <span className="text-foreground-muted">{ago(o.createdAt)}</span> },
    {
      key: 'details',
      header: '',
      align: 'right',
      render: (o) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); setDetailId(o.id); }}
          aria-label={`View full details for order ${o.orderNumber}`}
        >
          View details
        </Button>
      ),
    },
  ];

  return (
    <ManagementPage
      title="Orders"
      description="Every order across the platform, with live status."
      actions={
        <>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs text-foreground-muted" title="Auto-refreshing every 10s">
              <span className={visible ? 'h-2 w-2 rounded-full bg-success animate-pulse' : 'h-2 w-2 rounded-full bg-foreground-subtle'} />
              {visible ? 'Live' : 'Paused'}
            </span>
          )}
          <ExportButton url="/admin/orders/export" filename="orders.csv" />
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="admin-order-status">Filter by status</label>
        <select
          id="admin-order-status"
          value={status}
          onChange={(e) => { setStatus(e.target.value); q.setPage(1); }}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-foreground"
        >
          {FILTERS.map((f) => <option key={f.value || 'all'} value={f.value}>{f.label}</option>)}
        </select>

        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); q.setPage(1); }}
          placeholder="Search order number…"
          className="h-9 w-56"
        />

        <span className="ml-auto text-xs text-foreground-muted">
          {q.meta?.total ?? 0} order{(q.meta?.total ?? 0) === 1 ? '' : 's'}
        </span>
      </div>

      <ManagementTable
        rows={rows}
        columns={columns}
        getId={(o) => o.id}
        onRowClick={(o) => setDetailId(o.id)}
        loading={q.isLoading}
        emptyIcon="order"
        emptyTitle={status === 'live' ? 'No live orders' : 'No orders yet'}
        emptyDescription={status === 'live' ? 'New orders appear here the moment they are placed.' : undefined}
      />

      <AdminOrderDetailDrawer orderId={detailId} onClose={() => setDetailId(null)} />

      {q.pageCount > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={!q.hasPrev} onClick={() => q.setPage(q.page - 1)}>
            <Icon name="chevronLeft" className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-foreground-muted">Page {q.page} of {q.pageCount}</span>
          <Button variant="ghost" size="sm" disabled={!q.hasNext} onClick={() => q.setPage(q.page + 1)}>
            Next <Icon name="chevronRight" className="h-4 w-4" />
          </Button>
        </div>
      )}
    </ManagementPage>
  );
}

export default AdminOrdersPage;
