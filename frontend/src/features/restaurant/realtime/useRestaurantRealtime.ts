import { useCallback, useEffect, useRef } from 'react';

import { qk, queryClient } from '@/platform/query';
import { socketClient, useSocketEvent } from '@/platform/socket';
import { toast } from '@/design-system';
import { useStaffContext } from '../hooks/useStaffData';
import { activityStore } from './activity-store';
import { playOrderSound } from './sound';
import type { ActivityItem } from '../types';

type OrderEventPayload = { orderId?: string; id?: string; orderNumber?: string; status?: string; amount?: string };

let idSeq = 0;
const eventId = (prefix: string) => `${prefix}-${++idSeq}-${Math.round(Math.random() * 1e6)}`;

/**
 * useRestaurantRealtime — the ONE realtime engine for the dashboard. Mounted once
 * in the layout, it joins the staff rooms and subscribes to Order/Payment/Kitchen
 * events via the Socket Platform (NO polling). On events it:
 *   · plays the configurable new-order chime + toast (arrival),
 *   · prepends to the live activity feed,
 *   · batches a single invalidation of all `staff` queries (KPIs/board/analytics),
 * so counters, graphs, and the board update in sync.
 */
export function useRestaurantRealtime() {
  const { data: ctx } = useStaffContext();
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Join the staff rooms for the lifetime of the dashboard.
  useEffect(() => {
    const rooms = ctx?.rooms ?? [ctx?.branchId ? `branch:${ctx.branchId}` : ctx?.restaurantId ? `restaurant:${ctx.restaurantId}` : ''].filter(Boolean);
    rooms.forEach((r) => socketClient.joinRoom(r));
    return () => rooms.forEach((r) => socketClient.leaveRoom(r));
  }, [ctx?.rooms, ctx?.branchId, ctx?.restaurantId]);

  // Batched invalidation — one refresh of everything staff per event burst.
  const scheduleRefresh = useCallback(() => {
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      void queryClient.invalidateQueries({ queryKey: qk('staff') });
    }, 300);
  }, []);

  const pushActivity = useCallback((item: ActivityItem) => activityStore.prepend(item), []);

  useSocketEvent<OrderEventPayload>('order:created', (p) => {
    playOrderSound();
    toast.success('New order', { description: p.orderNumber ? `#${p.orderNumber}` : 'A new order just arrived' });
    pushActivity({ id: eventId('ord'), type: 'order', level: 'success', title: 'New order', description: p.orderNumber ? `#${p.orderNumber}` : undefined, at: new Date().toISOString(), orderId: p.orderId ?? p.id });
    scheduleRefresh();
  });

  useSocketEvent<OrderEventPayload>('order:status_changed', (p) => {
    pushActivity({ id: eventId('sts'), type: 'order', level: 'info', title: 'Order updated', description: p.orderNumber ? `#${p.orderNumber} · ${p.status ?? ''}` : p.status, at: new Date().toISOString(), orderId: p.orderId ?? p.id });
    scheduleRefresh();
  });

  useSocketEvent<OrderEventPayload>('order:updated', () => scheduleRefresh());

  useSocketEvent<OrderEventPayload>('payment:updated', (p) => {
    pushActivity({ id: eventId('pay'), type: 'payment', level: 'success', title: 'Payment update', description: p.orderNumber ? `#${p.orderNumber}` : undefined, at: new Date().toISOString(), orderId: p.orderId ?? p.id });
    scheduleRefresh();
  });

  useSocketEvent<OrderEventPayload>('kitchen:order_updated', () => scheduleRefresh());

  useSocketEvent<OrderEventPayload>('kitchen:sla_breached', (p) => {
    toast.warning('Kitchen SLA breached', { description: p.orderNumber ? `#${p.orderNumber}` : undefined });
    pushActivity({ id: eventId('sla'), type: 'kitchen', level: 'warning', title: 'SLA breached', description: p.orderNumber ? `#${p.orderNumber}` : undefined, at: new Date().toISOString(), orderId: p.orderId ?? p.id });
    scheduleRefresh();
  });

  useEffect(() => () => { if (flushTimer.current) clearTimeout(flushTimer.current); }, []);
}
