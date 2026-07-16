import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/platform/api';
import { offlineQueue } from './queue';

type OfflineContextValue = {
  isOnline: boolean;
  /** Number of mutations waiting to sync. */
  pending: number;
  /** Force a sync attempt. */
  sync: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

/**
 * OFFLINE PLATFORM provider. Detects connectivity, wires the API client's offline
 * queue (so queueable mutations are captured while offline), replays the queue on
 * reconnect, and exposes pending-count + sync for UI indicators. Centralizes all
 * offline behavior — business code just marks a mutation `offlineQueueable`.
 */
export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pending, setPending] = useState(() => offlineQueue.size());

  const sync = useCallback(async () => {
    for (const req of offlineQueue.all()) {
      try {
        await api.request(req.path, { method: req.method as never, body: req.body, query: req.query, headers: req.headers, offlineQueueable: false, retries: 1 });
        offlineQueue.remove(req.id);
      } catch {
        break; // stop on first failure; retry on next reconnect
      }
    }
    setPending(offlineQueue.size());
  }, []);

  useEffect(() => {
    // Wire the API client's offline hooks ONCE.
    api.setOnlineChecker(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    api.setOfflineQueue((req) => {
      offlineQueue.add(req);
      setPending(offlineQueue.size());
    });
  }, []);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); void sync(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (navigator.onLine) void sync(); // flush anything left from a prior session
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [sync]);

  const value = useMemo(() => ({ isOnline, pending, sync }), [isOnline, pending, sync]);
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within an <OfflineProvider>.');
  return ctx;
}

/** Lightweight online/offline boolean for banners/badges. */
export function useOnlineStatus(): boolean {
  return useOffline().isOnline;
}
