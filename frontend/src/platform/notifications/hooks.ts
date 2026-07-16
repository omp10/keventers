import { useMemo } from 'react';

import { selectUnreadCount, useNotificationStore, type AppNotification } from './store';
import { useNotificationActions } from './NotificationProvider';

/** Full inbox + actions. */
export function useNotifications() {
  const items = useNotificationStore((s) => s.items);
  const actions = useNotificationActions();
  return { items, ...actions };
}

/** Just the unread badge count — cheap, isolated subscription. */
export function useUnreadCount(): number {
  return useNotificationStore(selectUnreadCount);
}

/** Notifications grouped by category (for a grouped inbox UI). */
export function useGroupedNotifications() {
  const items = useNotificationStore((s) => s.items);
  return useMemo(() => {
    const map = new Map<string, AppNotification[]>();
    for (const n of items) {
      const key = n.category ?? 'general';
      const arr = map.get(key) ?? [];
      arr.push(n);
      map.set(key, arr);
    }
    return [...map.entries()].map(([category, list]) => ({ category, items: list }));
  }, [items]);
}
