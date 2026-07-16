import type { IconName } from '@/design-system';
import type { OrderingStatus, ServiceMode } from '../types';

/** Present a backend-supplied distance. We never COMPUTE distance — only format it. */
export function formatDistance(meters?: number): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 950) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0)} km`;
}

export function formatRating(rating?: number): string | null {
  return rating == null ? null : rating.toFixed(1);
}

export function formatPrepTime(minutes?: number): string | null {
  return minutes == null ? null : `${minutes} min`;
}

export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
  drive_thru: 'Drive-thru',
  curbside: 'Curbside',
};

export const SERVICE_MODE_ICONS: Record<ServiceMode, IconName> = {
  dine_in: 'utensils',
  takeaway: 'bag',
  delivery: 'truck',
  drive_thru: 'truck',
  curbside: 'store',
};

type StatusPresentation = { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info' };

export const ORDERING_STATUS: Record<OrderingStatus, StatusPresentation> = {
  available: { label: 'Ordering available', tone: 'success' },
  busy: { label: 'Busy', tone: 'warning' },
  unavailable: { label: 'Ordering unavailable', tone: 'neutral' },
  closed: { label: 'Closed', tone: 'danger' },
  coming_soon: { label: 'Coming soon', tone: 'info' },
};
