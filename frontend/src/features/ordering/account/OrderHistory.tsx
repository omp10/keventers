import { Link } from 'react-router-dom';

import { Badge, Icon, Spinner, EmptyState } from '@/design-system';
import { InfiniteSentinel } from '@/features/discovery';
import { formatMoney, ORDER_STATUS_PRESENTATION } from '../format';
import { useOrders } from '../hooks';
import type { Order } from '../types';

/**
 * OrderHistory — the customer's past + active orders (guest or linked). Infinite
 * scroll; each row deep-links to the live order page. Reuses the Discovery
 * Platform's InfiniteSentinel.
 */
export function OrderHistory() {
  const q = useOrders();
  const orders = (q.data?.pages.flatMap((p) => p.items) ?? []) as Order[];

  if (q.isLoading) {
    return (
      <div className="grid h-32 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="order" className="mb-3 h-8 w-8 text-muted-foreground" />}
        title="No orders yet"
        description="Your orders will appear here once you place one."
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const pres = ORDER_STATUS_PRESENTATION[o.status];
        return (
          <Link
            key={o.id}
            to={`/order/${o.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-border-strong"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon name="order" className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{o.branch.name}</p>
              <p className="truncate text-xs text-foreground-muted">
                #{o.orderNumber} · {new Date(o.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <Badge tone={pres.tone} variant="soft" className="mb-1">{pres.label}</Badge>
              <p className="text-sm font-semibold text-foreground">{formatMoney(o.pricing.total)}</p>
            </div>
          </Link>
        );
      })}
      <InfiniteSentinel hasMore={Boolean(q.hasNextPage)} loading={q.isFetchingNextPage} onLoadMore={q.fetchNextPage} />
    </div>
  );
}
