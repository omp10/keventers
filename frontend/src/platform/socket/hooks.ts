import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSocket } from './SocketProvider';

/** Subscribe to a socket event; auto-unsubscribes on unmount. Stable handler ref. */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void, namespace = '/') {
  const { client } = useSocket();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const off = client.on(event, (p) => ref.current(p as T), namespace);
    return () => { off(); };
  }, [client, event, namespace]);
}

/** Join a room for the lifetime of the component (leaves on unmount). */
export function useRoom(room: string | null | undefined, namespace = '/') {
  const { client } = useSocket();
  useEffect(() => {
    if (!room) return;
    client.joinRoom(room, namespace);
    return () => { client.leaveRoom(room, namespace); };
  }, [client, room, namespace]);
}

/**
 * useRealtimeQuery — bridge a socket event to a TanStack Query. When the event
 * fires it invalidates (or patches) the query, so lists/dashboards stay live
 * WITHOUT the business hook wiring sockets itself. Optionally scoped to a room.
 */
export function useRealtimeQuery(config: {
  queryKey: QueryKey;
  events: string[];
  room?: string;
  /** Patch the cache directly instead of invalidating (optimistic realtime). */
  onEvent?: (payload: unknown, ctx: { invalidate: () => void }) => void;
  namespace?: string;
}) {
  const { client } = useSocket();
  const qc = useQueryClient();
  useRoom(config.room, config.namespace);

  useEffect(() => {
    const invalidate = () => void qc.invalidateQueries({ queryKey: config.queryKey });
    const offs = config.events.map((ev) =>
      client.on(ev, (payload) => (config.onEvent ? config.onEvent(payload, { invalidate }) : invalidate()), config.namespace),
    );
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, JSON.stringify(config.queryKey), config.events.join(','), config.namespace]);
}

/** Track connection state for a status indicator. */
export function useConnectionState() {
  const { state, isConnected } = useSocket();
  return { state, isConnected };
}
