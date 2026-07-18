import { useMemo } from 'react';

import { toast } from '@/design-system';
import { qk, queryClient, useMutationResource, useQueryResource } from '@/platform/query';
import { useRealtimeQuery } from '@/platform/socket';
import { playOrderAlert } from '@/utils/order-alert';
import { NEXT_ACTION, staffService, type StaffOrder } from './staff.service';

const QUEUE_KEY = qk('staff', 'my-queue');
const HISTORY_KEY = qk('staff', 'my-history');

/**
 * My live worklist. Socket-first (kitchen events for my branch invalidate the
 * cache the moment a manager assigns something), with a slow poll as the net
 * for phones that drop the socket in a pocket.
 */
export function useMyQueue(search?: string) {
  const query = useQueryResource(
    qk('staff', 'my-queue', search ?? null),
    () => staffService.myQueue({ search: search || undefined }),
    { refetchInterval: 15_000 },
  );

  // The branch/restaurant room comes from MY context, not from queue data —
  // deriving it from the first assigned order meant an EMPTY queue joined no
  // room, so the very first assignment (the one that matters) never rang.
  const ctx = useQueryResource(qk('staff', 'context'), () => staffService.context(), { staleTime: 300_000, retry: false });
  // The restaurant room catches every branch's kitchen events (the backend
  // emits to both), so it's all a staff phone needs.
  const room = ctx.data?.rooms?.[0];
  // An ASSIGNMENT is work landing on someone's phone — ring the bell with the
  // refresh. Other kitchen chatter refreshes silently.
  useRealtimeQuery({
    queryKey: QUEUE_KEY,
    events: ['kitchen:order_assigned'],
    room,
    onEvent: (_payload, { invalidate }) => {
      void playOrderAlert();
      invalidate();
    },
  });
  useRealtimeQuery({
    queryKey: QUEUE_KEY,
    events: ['kitchen:order_updated', 'kitchen:queue_updated', 'kitchen:order_queued'],
  });

  return query;
}

export function useMyHistory(search?: string) {
  return useQueryResource(
    qk('staff', 'my-history', search ?? null),
    () => staffService.myHistory({ search: search || undefined }),
  );
}

/** Advance one of MY orders; refreshes both lists on success. */
export function useStaffActions() {
  const mutation = useMutationResource<StaffOrder, { orderId: string; action: 'preparing' | 'ready' | 'served' }>(
    ({ orderId, action }) => staffService.transition(orderId, action),
    {
      onSuccess: (entry) => {
        toast.success(`Order ${entry.orderNumber} → ${entry.status}`);
        void queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
        void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
      },
      onError: (err) => toast.error('Could not update the order', { description: err.message }),
    },
  );
  return {
    advance: (order: StaffOrder) => {
      const next = NEXT_ACTION[order.status];
      if (next) mutation.mutate({ orderId: order.orderId, action: next.action });
    },
    isBusy: mutation.isPending,
  };
}

/** Counts for the Home tab, derived from the live queue (no extra endpoint). */
export function useMyDaySummary() {
  const queue = useMyQueue();
  const history = useMyHistory();
  return useMemo(() => {
    const items = queue.data?.items ?? [];
    const by = (s: StaffOrder['status']) => items.filter((i) => i.status === s).length;
    return {
      isLoading: queue.isLoading || history.isLoading,
      active: items.length,
      toStart: by('assigned') + by('recalled') + by('refired'),
      preparing: by('preparing'),
      ready: by('ready'),
      completedToday: (history.data?.items ?? []).filter((i) => i.status === 'served').length,
      queue,
    };
  }, [queue, history]);
}
