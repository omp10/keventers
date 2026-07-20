import { queryClient, useMutationResource } from '@/platform/query';
import { toast } from '@/design-system';
import { kitchenService } from '../services';
import type { KitchenAction, KitchenEntry, OrderPriority } from '../types';
import { KK } from './keys';

const TOAST: Record<KitchenAction, string> = {
  assign: 'Assigned',
  start: 'Started preparing',
  ready: 'Marked ready',
  serve: 'Marked served',
  recall: 'Order recalled',
  refire: 'Order re-fired',
  cancel: 'Order cancelled',
  priority: 'Priority updated',
};

/**
 * useKitchenActions — triggers the backend kitchen state machine. The frontend
 * never decides routing/timers/SLA; it POSTs an action verb and writes the returned
 * entry back to the cache (optimistic patch), then reconciles via invalidation. The
 * realtime engine also broadcasts the change to every other display.
 */
export function useKitchenActions() {
  const m = useMutationResource<KitchenEntry, { orderId: string; action: KitchenAction; payload?: Record<string, unknown> }>(
    ({ orderId, action, payload }) => kitchenService.transition(orderId, action, payload),
    {
      onSuccess: (entry, vars) => {
        queryClient.setQueryData<KitchenEntry[]>(KK.queue(), (cur) => (cur ? cur.map((e) => (e.orderId === entry.orderId ? entry : e)) : cur));
        void queryClient.invalidateQueries({ queryKey: KK.queue() });
        void queryClient.invalidateQueries({ queryKey: KK.metrics() });
        toast.success(TOAST[vars.action]);
      },
      onError: (e) => {
        // A rejected transition almost always means the board is STALE —
        // someone else (or the staff app) already moved this ticket. Pull the
        // queue so the card corrects itself instead of leaving a dead button
        // the operator taps again and again.
        void queryClient.invalidateQueries({ queryKey: KK.queue() });
        toast.error('Action failed', { description: (e as Error).message });
      },
    },
  );

  const run = (orderId: string, action: KitchenAction, payload?: Record<string, unknown>) => m.mutateAsync({ orderId, action, payload });

  return {
    assign: (orderId: string, opts: { stationId?: string; chefId?: string }) => run(orderId, 'assign', opts),
    start: (orderId: string) => run(orderId, 'start'),
    ready: (orderId: string) => run(orderId, 'ready'),
    serve: (orderId: string) => run(orderId, 'serve'),
    recall: (orderId: string, reason?: string) => run(orderId, 'recall', { reason }),
    refire: (orderId: string, reason?: string) => run(orderId, 'refire', { reason }),
    cancel: (orderId: string, reason?: string) => run(orderId, 'cancel', { reason }),
    setPriority: (orderId: string, priority: OrderPriority) => run(orderId, 'priority', { priority }),
    isPending: m.isPending,
  };
}
