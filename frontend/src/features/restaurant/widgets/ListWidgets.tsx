import { Card, Icon, Skeleton, type IconName } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { cn } from '@/lib/cn';
import type { ActivityItem, TopProduct } from '../types';

/** Top-selling products widget (backend-ranked). */
export function TopProductsWidget({ products, loading }: { products: TopProduct[]; loading?: boolean }) {
  return (
    <Card padding="md">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon name="trend" className="h-4 w-4 text-primary" /> Top selling
      </h3>
      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : products.length === 0 ? (
        <p className="text-sm text-foreground-subtle">No sales yet.</p>
      ) : (
        <ol className="space-y-2.5">
          {products.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{p.name}</span>
              <span className="shrink-0 text-xs text-foreground-muted">×{p.quantity}</span>
              <span className="shrink-0 text-sm font-medium text-foreground">{formatMoney(p.revenue)}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

const ACTIVITY_ICON: Record<ActivityItem['type'], IconName> = { order: 'order', payment: 'payment', kitchen: 'flame', system: 'bell' };
const LEVEL_COLOR: Record<NonNullable<ActivityItem['level']>, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

/** Live recent-activity feed widget (fed by the realtime engine). */
export function ActivityFeedWidget({ items, loading, onOpenOrder }: { items: ActivityItem[]; loading?: boolean; onOpenOrder?: (id: string) => void }) {
  return (
    <Card padding="md">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon name="clock" className="h-4 w-4 text-primary" /> Recent activity
      </h3>
      {loading && items.length === 0 ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : items.length === 0 ? (
        <p className="text-sm text-foreground-subtle">Activity will appear here in realtime.</p>
      ) : (
        <ul className="max-h-80 space-y-3 overflow-y-auto">
          {items.map((a) => (
            <li key={a.id} className="flex gap-2.5">
              <Icon name={ACTIVITY_ICON[a.type]} className={cn('mt-0.5 h-4 w-4 shrink-0', a.level ? LEVEL_COLOR[a.level] : 'text-foreground-subtle')} />
              <button
                type="button"
                disabled={!a.orderId || !onOpenOrder}
                onClick={() => a.orderId && onOpenOrder?.(a.orderId)}
                className={cn('min-w-0 flex-1 text-left', a.orderId && onOpenOrder && 'hover:opacity-80')}
              >
                <span className="block text-sm font-medium text-foreground">{a.title}</span>
                {a.description && <span className="block text-xs text-foreground-muted">{a.description}</span>}
                <span className="block text-[0.6875rem] text-foreground-subtle">{new Date(a.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
