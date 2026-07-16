import { qk, useInfiniteResource, useQueryResource } from '@/platform/query';
import { useRealtimeQuery } from '@/platform/socket';
import { orderService } from '../services';
import type { Order } from '../types';

/**
 * useOrder — a single order, kept LIVE via the Socket Platform (no polling). Order,
 * kitchen, and payment events for this order's room invalidate the cache so the
 * tracking timeline updates in realtime.
 */
export function useOrder(orderId: string | undefined) {
  const query = useQueryResource<Order>(
    qk('ordering', 'order', orderId ?? null),
    () => orderService.get(orderId!),
    { enabled: Boolean(orderId) },
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
