import { Badge, Button, Icon, Popover, PopoverContent, PopoverTrigger, EmptyState, type IconName } from '@/design-system';
import { cn } from '@/lib/cn';
import { useNotifications, useUnreadCount } from './hooks';
import type { AppNotification } from './store';

const levelIcon: Record<AppNotification['level'], IconName> = {
  info: 'bell',
  success: 'checkCircle',
  warning: 'warning',
  error: 'error',
};

/**
 * NotificationCenter — the reusable bell + inbox popover, wired entirely to the
 * Notification Platform (store + actions). Drop it into any shell topbar; it owns
 * no fetching logic itself.
 */
export function NotificationCenter({ className }: { className?: string }) {
  const { items, markRead, markAllRead } = useNotifications();
  const unread = useUnreadCount();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          className={cn('relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground', className)}
        >
          <Icon name="bell" className="h-5 w-5" />
          {unread > 0 && (
            <Badge
              tone="danger"
              variant="solid"
              className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          )}
        </header>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Icon name="bell" className="mb-3 h-8 w-8 text-muted-foreground" />} title="You're all caught up" description="New notifications will show up here." size="sm" />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-muted', !n.read && 'bg-primary/5')}
                  >
                    <Icon name={n.icon ?? levelIcon[n.level]} className={cn('mt-0.5 h-4 w-4 shrink-0', !n.read ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>}
                    </span>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
