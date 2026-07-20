import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { toast } from '@/design-system';
import { notificationService } from '@/services';
import { tokenStore, useAuth } from '@/platform/auth';
import { useSocketEvent } from '@/platform/socket';
import { initPush } from '@/platform/push/fcm';
import { useNotificationStore, type AppNotification } from './store';

type NotificationContextValue = {
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const toAppNotification = (raw: Partial<AppNotification> & { id: string; title: string }): AppNotification => ({
  level: 'info',
  read: false,
  createdAt: raw.createdAt ?? new Date(0).toISOString(),
  ...raw,
});

/**
 * NOTIFICATION PLATFORM — subscribes ONCE to the socket `notification:new` event
 * (through the Socket Platform, never a raw socket) and to the REST inbox, feeding
 * the single notification store. Also raises a toast for live notifications.
 * Business code never subscribes to notification events directly.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isGuest } = useAuth();
  const store = useNotificationStore;

  const refresh = useCallback(async () => {
    if (!isAuthenticated && !isGuest) return;
    // The REST inbox (`/notifications`) is GUEST-SESSION scoped on the backend:
    // it reads the recipient from the guest token in the Authorization header.
    // Staff/admin surfaces carry a staff token instead, so calling it there
    // always 401s — which the API client reads as "session dead" and logs the
    // user straight back out. Staff notifications come from the socket feed and
    // their own /restaurant|/admin endpoints.
    if (!tokenStore.getGuest()) return;
    try {
      const page = await notificationService.inbox<AppNotification>();
      store.getState().hydrate((page.items ?? []).map(toAppNotification));
    } catch {
      /* inbox is best-effort; live socket still populates */
    }
  }, [isAuthenticated, isGuest, store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // FCM web push — register this device once the user is known. A complete
  // no-op unless a Firebase project is configured (VITE_FIREBASE_*); a
  // foreground push surfaces as the same toast the socket feed uses.
  useEffect(() => {
    // ACCOUNT ONLY. Device tokens are stored against a user, so the backend
    // guards /notifications/devices with requireAuth — a guest's POST 401s, and
    // the API client reads any 401 on a guest credential as "table session
    // dead", wiping the session and bouncing the diner to the scanner. Push
    // registration must never be able to end someone's meal; guests keep the
    // in-app + socket alerts they already had.
    if (!isAuthenticated) return;
    void initPush((payload) => {
      const p = (payload as { notification?: { title?: string; body?: string } })?.notification;
      if (p?.title) toast.info(p.title, { description: p.body });
    });
  }, [isAuthenticated]);

  // Live notifications — one subscription for the whole app.
  useSocketEvent<Partial<AppNotification> & { id: string; title: string }>('notification:new', (raw) => {
    const n = toAppNotification({ ...raw, createdAt: raw.createdAt ?? new Date().toISOString() });
    store.getState().add(n);
    toast[n.level === 'error' ? 'error' : n.level === 'success' ? 'success' : n.level === 'warning' ? 'warning' : 'info']?.(
      n.title,
      { description: n.body },
    );
  });

  const markRead = useCallback(
    async (id: string) => {
      store.getState().markRead(id);
      try {
        await notificationService.markRead(id);
      } catch {
        /* optimistic; server reconciles on next refresh */
      }
    },
    [store],
  );

  const markAllRead = useCallback(async () => {
    store.getState().markAllRead();
    try {
      await notificationService.markAllRead();
    } catch {
      /* optimistic */
    }
  }, [store]);

  const value = useMemo<NotificationContextValue>(() => ({ refresh, markRead, markAllRead }), [refresh, markRead, markAllRead]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationActions(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationActions must be used within <NotificationProvider>');
  return ctx;
}
