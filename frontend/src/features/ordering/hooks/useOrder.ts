import { qk, useInfiniteResource, useQueryResource } from '@/platform/query';
import { useRealtimeQuery } from '@/platform/socket';
import { orderService } from '../services';
import type { Order } from '../types';

/** Statuses during which the customer is actively watching food move. */
const LIVE_STATUSES: Order['status'][] = ['placed', 'confirmed', 'preparing', 'ready'];

/**
 * useOrder — a single order, kept LIVE via the Socket Platform. Order, kitchen,
 * and payment events for this order's room invalidate the cache so the tracking
 * timeline updates in realtime.
 *
 * The socket is the PRIMARY transport; a slow refetch runs only while the order
 * is in an in-flight status as a resilience net (dropped socket, missed room
 * join, phone waking from sleep), and stops the moment the order settles.
 */
export function useOrder(orderId: string | undefined) {
  const query = useQueryResource<Order>(
    qk('ordering', 'order', orderId ?? null),
    () => orderService.get(orderId!),
    {
      enabled: Boolean(orderId),
      refetchInterval: (q) =>
        q.state.data && LIVE_STATUSES.includes(q.state.data.status) ? 10_000 : false,
    },
  );

  useRealtimeQuery({
    queryKey: qk('ordering', 'order', orderId ?? null),
    events: ['order:updated', 'order:status_changed', 'payment:updated', 'kitchen:order_updated'],
    room: orderId ? `order:${orderId}` : undefined,
  });

  return query;
}

/** Guest/customer order history (infinite scroll). */
export function useOrders() {
  return useInfiniteResource<Order>(qk('ordering', 'orders'), (page) => orderService.list(page));
}
