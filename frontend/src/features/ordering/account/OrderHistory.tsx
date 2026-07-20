import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Icon, Spinner, EmptyState } from '@/design-system';
import { InfiniteSentinel } from '@/features/discovery';
import { formatMoney, ORDER_STATUS_PRESENTATION } from '../format';
import { useOrders } from '../hooks';
import type { Order } from '../types';
import { RateOrderSheet } from './RateOrderSheet';

/** Once the food has arrived, rating it makes sense — not before. */
const RATEABLE: Order['status'][] = ['served', 'completed'];

/**
 * OrderHistory — every order the customer has placed (account-wide, not just
 * the current table session) and the place they rate them: each DISH and the
 * RESTAURANT are scored separately, and those scores are the source of truth
 * for the dish + outlet ratings shown everywhere else.
 */
export function OrderHistory() {
  const q = useOrders();
  const navigate = useNavigate();
  const [rating, setRating] = useState<string | null>(null);
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
        const canRate = RATEABLE.includes(o.status);
        const open = rating === o.id;
        return (
          <div key={o.id} className="rounded-xl border border-border bg-surface p-3">
            <button
              type="button"
              onClick={() => navigate(`/order/${o.id}`)}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
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
            </button>

            {canRate && !open && (
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                leftIcon="star"
                className="mt-3"
                onClick={() => setRating(o.id)}
              >
                Rate dishes & restaurant
              </Button>
            )}

            {open && <RateOrderSheet order={o} onClose={() => setRating(null)} />}
          </div>
        );
      })}
      <InfiniteSentinel hasMore={Boolean(q.hasNextPage)} loading={q.isFetchingNextPage} onLoadMore={q.fetchNextPage} />
    </div>
  );
}
