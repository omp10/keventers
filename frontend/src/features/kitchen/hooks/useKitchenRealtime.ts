import { useCallback, useEffect, useRef } from 'react';

import { queryClient } from '@/platform/query';
import { socketClient, useSocketEvent } from '@/platform/socket';
import { useStaffContext } from '@/features/restaurant';
import { playKitchenSound } from '../audio/kitchen-audio';
import { KK } from './keys';

type KitchenEventPayload = { orderId?: string; orderNumber?: string; priority?: string; station?: string };

/**
 * useKitchenRealtime — the ONE realtime engine for the KDS. Mounted once in the
 * shell. It joins the staff/kitchen rooms and consumes the backend Kitchen Socket.IO
 * events (NO polling), plays the configured audio cue per event (new / priority /
 * SLA / ready), and BATCHES a single invalidation of the queue + metrics per event
 * burst so every column + KPI updates in sync across all displays.
 */
export function useKitchenRealtime() {
  const { data: ctx } = useStaffContext();
  const flush = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const rooms = ctx?.rooms ?? [ctx?.branchId ? `branch:${ctx.branchId}` : ctx?.restaurantId ? `restaurant:${ctx.restaurantId}` : ''].filter(Boolean);
    rooms.forEach((r) => socketClient.joinRoom(r));
    return () => rooms.forEach((r) => socketClient.leaveRoom(r));
  }, [ctx?.rooms, ctx?.branchId, ctx?.restaurantId]);

  const scheduleRefresh = useCallback(() => {
    if (flush.current) return;
    flush.current = setTimeout(() => {
      flush.current = null;
      void queryClient.invalidateQueries({ queryKey: KK.queue() });
      void queryClient.invalidateQueries({ queryKey: KK.metrics() });
    }, 250);
  }, []);

  // Event names ARE the backend's SOCKET_EVENTS values (kitchen.constants.js /
  // order.constants.js). This hook used to listen for 'kitchen:order_created',
  // 'order:created' and 'order:status_changed' — none of which the backend has
  // ever emitted, so the new-order chime never once fired.
  const onNew = (p: KitchenEventPayload) => {
    playKitchenSound(p.priority === 'rush' || p.priority === 'vip' ? 'priority' : 'new');
    scheduleRefresh();
  };
  useSocketEvent<KitchenEventPayload>('kitchen:order_queued', onNew);
  useSocketEvent<KitchenEventPayload>('order:placed', onNew);
  useSocketEvent<KitchenEventPayload>('kitchen:order_ready', () => {
    playKitchenSound('ready');
    scheduleRefresh();
  });
  useSocketEvent<KitchenEventPayload>('kitchen:sla_breached', () => {
    playKitchenSound('sla');
    scheduleRefresh();
  });
  useSocketEvent<KitchenEventPayload>('kitchen:sla_approaching', () => {
    playKitchenSound('sla');
    scheduleRefresh();
  });
  useSocketEvent<KitchenEventPayload>('kitchen:queue_updated', () => scheduleRefresh());
  useSocketEvent<KitchenEventPayload>('kitchen:order_assigned', () => scheduleRefresh());
  useSocketEvent<KitchenEventPayload>('kitchen:order_preparing', () => scheduleRefresh());
  useSocketEvent<KitchenEventPayload>('kitchen:order_served', () => scheduleRefresh());
  useSocketEvent<KitchenEventPayload>('kitchen:order_recalled', () => scheduleRefresh());

  useEffect(() => () => { if (flush.current) clearTimeout(flush.current); }, []);
}
