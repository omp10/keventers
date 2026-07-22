import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Card, EmptyState, Icon, Input, Skeleton } from '@/design-system';
import { NotificationsList } from '@/features/ordering';
import { useAuth } from '@/platform/auth';
import { cn } from '@/lib/cn';
import { useMyDaySummary, useMyHistory, useMyQueue, useStaffActions } from './hooks';
import { NEXT_ACTION, type StaffOrder } from './staff.service';

/* ── shared bits ─────────────────────────────────────────────────────────── */

const STATUS_TONE: Record<string, 'info' | 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  assigned: 'info',
  preparing: 'primary',
  ready: 'success',
  served: 'success',
  recalled: 'warning',
  refired: 'warning',
  cancelled: 'danger',
};

/** One order, thumb-sized: what it is, where it goes, ONE next action. */
function StaffOrderCard({ order, showAction = true }: { order: StaffOrder; showAction?: boolean }) {
  const { advance, isBusy } = useStaffActions();
  const next = NEXT_ACTION[order.status];
  return (
    <Card padding="md" className={cn('space-y-3', order.slaState === 'breached' && 'border-danger/40')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs text-foreground-subtle">{order.orderNumber}</p>
          <p className="truncate text-sm font-semibold text-foreground">
            {order.tableLabel || order.orderType.replace('_', ' ')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {order.slaState === 'breached' && <Badge tone="danger" variant="soft">Late</Badge>}
          <Badge tone={STATUS_TONE[order.status] ?? 'neutral'} variant="soft" className="capitalize">{order.status}</Badge>
        </div>
      </div>

      <ul className="space-y-1 text-sm text-foreground-muted">
        {order.items.map((it) => (
          <li key={it.id} className="flex gap-2">
            <span className="font-semibold text-foreground">{it.quantity}×</span>
            <span className="min-w-0 truncate">
              {it.name}
              {it.variantName ? ` · ${it.variantName}` : ''}
            </span>
          </li>
        ))}
      </ul>

      {showAction && next && (
        <Button fullWidth size="lg" loading={isBusy} onClick={() => advance(order)}>
          {next.label}
        </Button>
      )}
    </Card>
  );
}

function CardListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} padding="md" className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ))}
    </div>
  );
}

/* ── Home ────────────────────────────────────────────────────────────────── */

export function StaffHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const day = useMyDaySummary();

  const stats: [string, number, string][] = [
    ['To start', day.toStart, '/staff/orders'],
    ['Preparing', day.preparing, '/staff/orders'],
    ['Ready', day.ready, '/staff/orders'],
    ['Done today', day.completedToday, '/staff/history'],
  ];

  const nextUp = (day.queue.data?.items ?? []).filter((o) => NEXT_ACTION[o.status]).slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm text-foreground-muted">On shift</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">
          Hi{user?.firstName ? `, ${user.firstName}` : ''} 👋
        </h1>
      </header>

      {/* 2-up on a phone, 4-up once there is room — grid-cols-2 at every
          width made these read as four huge slabs on a laptop. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value, href]) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(href)}
            className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-2xl font-bold text-foreground">{day.isLoading ? '—' : value}</p>
            <p className="text-xs text-foreground-muted">{label}</p>
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Next up</h2>
        {day.queue.isLoading ? (
          <CardListSkeleton />
        ) : nextUp.length === 0 ? (
          <EmptyState
            icon={<Icon name="checkCircle" className="mb-3 h-8 w-8 text-success" />}
            title="All caught up"
            description="New orders assigned to you will appear here the moment they land."
          />
        ) : (
          nextUp.map((o) => <StaffOrderCard key={o.id} order={o} />)
        )}
      </section>
    </div>
  );
}

/* ── Orders (assigned worklist) ──────────────────────────────────────────── */

export function StaffOrdersPage() {
  const [search, setSearch] = useState('');
  const queue = useMyQueue();

  const items = useMemo(() => {
    const all = queue.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.tableLabel.toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q)),
    );
  }, [queue.data, search]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold text-foreground">My orders</h1>
      <Input
        type="search"
        leftIcon="search"
        placeholder="Search order, table, item…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {queue.isLoading ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Icon name="order" className="mb-3 h-8 w-8 text-foreground-subtle" />}
          title={search ? 'No matches' : 'Nothing assigned yet'}
          description={search ? 'Try a different search.' : 'Your manager assigns orders from the kitchen board — they appear here instantly.'}
        />
      ) : (
        <div className="space-y-3">{items.map((o) => <StaffOrderCard key={o.id} order={o} />)}</div>
      )}
    </div>
  );
}

/* ── History ─────────────────────────────────────────────────────────────── */

export function StaffHistoryPage() {
  const [search, setSearch] = useState('');
  const history = useMyHistory(search);

  const items = history.data?.items ?? [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold text-foreground">History</h1>
      <Input type="search" leftIcon="search" placeholder="Search past orders…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {history.isLoading ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={<Icon name="clock" className="mb-3 h-8 w-8 text-foreground-subtle" />} title="No history yet" description="Orders you've served will show up here." />
      ) : (
        <div className="space-y-3">{items.map((o) => <StaffOrderCard key={o.id} order={o} showAction={false} />)}</div>
      )}
    </div>
  );
}

/* ── Notifications (platform reuse) ──────────────────────────────────────── */

export function StaffNotificationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold text-foreground">Alerts</h1>
      <NotificationsList />
    </div>
  );
}

/* ── Profile ─────────────────────────────────────────────────────────────── */

export function StaffProfilePage() {
  const { user, roles, logout } = useAuth();
  const navigate = useNavigate();

  const rows: [string, string][] = [
    ['Name', user?.fullName ?? '—'],
    ['Phone', user?.phone ?? '—'],
    ['Email', user?.email ?? '—'],
    ['Role', roles.join(', ') || '—'],
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-lg font-bold text-primary">
          {(user?.firstName ?? 'S').charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">{user?.fullName ?? 'Staff member'}</h1>
          <p className="text-sm text-foreground-muted">Floor staff</p>
        </div>
      </header>

      <Card padding="md" className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <span className="text-sm text-foreground-muted">{label}</span>
            <span className="min-w-0 truncate text-sm font-medium text-foreground">{value}</span>
          </div>
        ))}
      </Card>

      <Button
        variant="secondary"
        fullWidth
        leftIcon="logout"
        onClick={() => void logout().then(() => navigate('/staff/login'))}
      >
        Sign out
      </Button>
      <p className="text-center text-xs text-foreground-subtle">
        <Icon name="shield" className="mr-1 inline h-3 w-3" />
        You only ever see orders assigned to you.
      </p>
    </div>
  );
}
