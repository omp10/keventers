import { qk, queryClient, usePaginatedResource, useMutationResource, useQueryResource } from '@/platform/query';
import { useRealtimeQuery } from '@/platform/socket';
import { toast } from '@/design-system';
import { staffOrderService, type OrderFilters } from '../services';
import type { OrderAction, OrderSummary, StaffOrderDetail } from '../types';
import { K } from './keys';

/**
 * useLiveOrders — the primary operational list. Server-paginated; kept live by the
 * Socket Platform (order/payment/kitchen events invalidate this key). Board views
 * group these client-side by status bucket — the DATA is identical across views.
 */
export function useLiveOrders(filters: OrderFilters) {
  const query = usePaginatedResource<OrderSummary>(
    K.orders(filters),
    (page, limit) => staffOrderService.list(filters, page, limit),
    { limit: 50, staleTime: 10_000 },
  );

  useRealtimeQuery({
    queryKey: qk('staff', 'orders'),
    events: ['order:created', 'order:updated', 'order:status_changed', 'payment:updated', 'kitchen:order_updated'],
  });

  return query;
}

/** A single order, kept live for its room (order/payment/kitchen events). */
export function useOrderDetail(orderId: string | undefined) {
  const query = useQueryResource<StaffOrderDetail>(
    K.order(orderId),
    () => staffOrderService.get(orderId!),
    { enabled: Boolean(orderId) },
  );
  useRealtimeQuery({
    queryKey: K.order(orderId),
    events: ['order:updated', 'order:status_changed', 'payment:updated', 'kitchen:order_updated'],
    room: orderId ? `order:${orderId}` : undefined,
  });
  return query;
}

const ACTION_TOAST: Record<OrderAction, string> = {
  confirm: 'Order accepted',
  start: 'Preparation started',
  ready: 'Marked ready',
  serve: 'Marked served',
  complete: 'Order completed',
  cancel: 'Order cancelled',
};

/**
 * useOrderActions — advances orders via the backend state machine. The frontend
 * never sets status directly; it POSTs an action and writes the returned order back
 * to the cache, then invalidates the board + dashboard.
 */
export function useOrderActions() {
  const m = useMutationResource<StaffOrderDetail, { id: string; action: OrderAction; payload?: Record<string, unknown> }>(
    ({ id, action, payload }) => staffOrderService.transition(id, action, payload),
    {
      onSuccess: (order, vars) => {
        queryClient.setQueryData(K.order(order.id), order);
        void queryClient.invalidateQueries({ queryKey: qk('staff', 'orders') });
        void queryClient.invalidateQueries({ queryKey: K.dashboard() });
        toast.success(ACTION_TOAST[vars.action]);
      },
      onError: (e) => toast.error('Action failed', { description: (e as Error).message }),
    },
  );

  const run = (id: string, action: OrderAction, payload?: Record<string, unknown>) => m.mutateAsync({ id, action, payload });

  return {
    confirm: (id: string) => run(id, 'confirm'),
    start: (id: string) => run(id, 'start'),
    ready: (id: string) => run(id, 'ready'),
    serve: (id: string) => run(id, 'serve'),
    complete: (id: string) => run(id, 'complete'),
    cancel: (id: string, reason?: string) => run(id, 'cancel', { reason }),
    isPending: m.isPending,
  };
}
