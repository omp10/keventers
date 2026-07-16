import type { SlaState, KitchenStatus } from '../types';

/** mm:ss (or h:mm:ss) from seconds — the large kitchen timer format. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return `${m}:${String(sec).padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  return `${h}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Seconds elapsed since an ISO timestamp, relative to a `now` epoch (ms). */
export function elapsedSince(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
}

/** SLA state → high-contrast status color classes (theme tokens). */
export const SLA_PRESENTATION: Record<SlaState, { label: string; text: string; bg: string; ring: string; dot: string }> = {
  on_time: { label: 'On time', text: 'text-success', bg: 'bg-success-soft', ring: 'ring-success', dot: 'bg-success' },
  approaching: { label: 'Approaching', text: 'text-warning', bg: 'bg-warning-soft', ring: 'ring-warning', dot: 'bg-warning' },
  breached: { label: 'Breached', text: 'text-danger', bg: 'bg-danger-soft', ring: 'ring-danger', dot: 'bg-danger' },
};

export const KITCHEN_STATUS_LABEL: Record<KitchenStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  recalled: 'Recalled',
  refired: 'Re-fired',
  cancelled: 'Cancelled',
};
