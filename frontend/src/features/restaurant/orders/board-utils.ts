import { ORDER_BUCKETS, type OrderAction, type OrderStatus, type OrderSummary } from '../types';

/** Group orders into operational buckets (used by every board view — same data). */
export function groupByBucket(orders: OrderSummary[]) {
  return ORDER_BUCKETS.map((b) => ({ ...b, orders: orders.filter((o) => b.statuses.includes(o.status)) }));
}

/** Minutes since an ISO timestamp, as a compact label. */
export function waitingLabel(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** The single "advance" action for a status, if any (drives the card's primary button). */
export function nextAction(status: OrderStatus): { action: OrderAction; label: string } | null {
  switch (status) {
    case 'placed':
      return { action: 'confirm', label: 'Accept' };
    case 'confirmed':
      return { action: 'start', label: 'Start' };
    case 'preparing':
      return { action: 'ready', label: 'Mark ready' };
    case 'ready':
      return { action: 'complete', label: 'Complete' };
    default:
      return null;
  }
}
