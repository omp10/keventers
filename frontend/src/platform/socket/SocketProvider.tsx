import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/platform/auth';
import { tokenStore } from '@/platform/auth';
import { socketClient, type ConnectionState } from './client';

type SocketContextValue = {
  client: typeof socketClient;
  state: ConnectionState;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextValue | null>(null);

/**
 * SOCKET PLATFORM provider. Wires the socket client's token provider to the token
 * store (decoupled), connects on mount, tracks connection state, and re-auths the
 * socket whenever the auth status changes (login / guest / logout). Mount under
 * the AuthProvider. Business realtime features consume `useSocket*` — never `io`.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [state, setState] = useState<ConnectionState>('disconnected');

  useEffect(() => {
    socketClient.setTokenProvider(() => tokenStore.getAccess() ?? tokenStore.getGuest());
    const unsubState = socketClient.onState(setState);
    // Re-auth on ANY token change — React auth status alone misses guest
    // ordering sessions, which write their token straight into the store.
    const unsubTokens = tokenStore.subscribe(() => socketClient.reauthenticate());
    socketClient.connect();
    return () => {
      unsubState();
      unsubTokens();
    };
  }, []);

  // Re-authenticate the socket when the session changes.
  useEffect(() => {
    if (status === 'loading') return;
    socketClient.reauthenticate();
  }, [status]);

  const value = useMemo(
    () => ({ client: socketClient, state, isConnected: state === 'connected' }),
    [state],
  );
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a <SocketProvider>.');
  return ctx;
}
