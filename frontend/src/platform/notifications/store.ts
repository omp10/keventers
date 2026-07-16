import { create } from 'zustand';

import type { IconName } from '@/design-system';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export type AppNotification = {
  id: string;
  title: string;
  body?: string;
  level: NotificationLevel;
  /** Domain category, e.g. 'order', 'payment' — used for grouping/icon. */
  category?: string;
  icon?: IconName;
  href?: string;
  read: boolean;
  /** ISO timestamp. */
  createdAt: string;
  data?: unknown;
};

type NotificationState = {
  items: AppNotification[];
  add: (n: AppNotification) => void;
  /** Merge a page from the inbox (dedup by id, newest first). */
  hydrate: (items: AppNotification[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
};

const byNewest = (a: AppNotification, b: AppNotification) => (a.createdAt < b.createdAt ? 1 : -1);

/**
 * NOTIFICATION STORE — the single client-side inbox. The provider feeds it from
 * the socket + REST; components read it via hooks. No component owns notification
 * state directly.
 */
export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  add: (n) =>
    set((s) => (s.items.some((x) => x.id === n.id) ? s : { items: [n, ...s.items].sort(byNewest) })),
  hydrate: (incoming) =>
    set((s) => {
      const map = new Map(s.items.map((x) => [x.id, x]));
      for (const n of incoming) map.set(n.id, { ...map.get(n.id), ...n });
      return { items: [...map.values()].sort(byNewest) };
    }),
  markRead: (id) => set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
  remove: (id) => set((s) => ({ items: s.items.filter((n) => n.id !== id) })),
  clear: () => set({ items: [] }),
}));

export const selectUnreadCount = (s: NotificationState) => s.items.reduce((n, x) => n + (x.read ? 0 : 1), 0);
