import { useNavigate } from 'react-router-dom';

import { Icon, EmptyState, Button } from '@/design-system';
import { cn } from '@/lib/cn';
import { useNotifications, useUnreadCount } from '@/platform/notifications';

/**
 * NotificationsList — the notifications inbox page. Consumes the Notification
 * Platform (realtime order/payment/promo/system messages). Tapping a notification
 * marks it read and deep-links to its target.
 */
export function NotificationsList() {
  const { items, markRead, markAllRead } = useNotifications();
  const unread = useUnreadCount();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="bell" className="mb-3 h-8 w-8 text-muted-foreground" />}
        title="No notifications"
        description="Order and payment updates will show up here."
        size="sm"
      />
    );
  }

  return (
    <div>
      {unread > 0 && (
        <div className="mb-2 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>Mark all read</Button>
        </div>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => {
                void markRead(n.id);
                if (n.href) navigate(n.href);
              }}
              className={cn('flex w-full gap-3 p-3.5 text-left transition hover:bg-muted', !n.read && 'bg-primary/5')}
            >
              <Icon name={n.icon ?? 'bell'} className={cn('mt-0.5 h-4 w-4 shrink-0', !n.read ? 'text-primary' : 'text-foreground-subtle')} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{n.title}</span>
                {n.body && <span className="mt-0.5 block text-xs text-foreground-muted">{n.body}</span>}
                <span className="mt-0.5 block text-[0.6875rem] text-foreground-subtle">{new Date(n.createdAt).toLocaleString()}</span>
              </span>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
