import { Badge } from '@/design-system';
import type { Availability, AvailabilityState, CatalogStatus } from '../types';

const STATUS_TONE: Record<CatalogStatus, 'success' | 'neutral' | 'info' | 'warning'> = {
  active: 'success',
  draft: 'neutral',
  inactive: 'info',
  archived: 'warning',
};
// Labels read the way a manager thinks (is it on the menu?) while the KEYS stay
// the API's own enum — the old map keyed on 'published'/'scheduled', values the
// API never sends, so every badge looked up undefined.
const STATUS_LABEL: Record<CatalogStatus, string> = {
  active: 'Live',
  draft: 'Draft',
  inactive: 'Hidden',
  archived: 'Archived',
};

/** Catalog lifecycle badge (backend-owned state; theme-driven). */
export function StatusBadge({ status }: { status: CatalogStatus }) {
  return <Badge tone={STATUS_TONE[status]} variant="soft">{STATUS_LABEL[status]}</Badge>;
}

const AVAIL_TONE: Record<AvailabilityState, 'success' | 'danger' | 'warning'> = {
  available: 'success',
  out_of_stock: 'danger',
  temporarily_disabled: 'warning',
};
const AVAIL_LABEL: Record<AvailabilityState, string> = {
  available: 'Available',
  out_of_stock: 'Out of stock',
  temporarily_disabled: 'Paused',
};

/** Availability badge — reflects backend availability status only. */
export function AvailabilityBadge({ availability }: { availability?: Availability }) {
  if (!availability?.status) return null;
  return <Badge tone={AVAIL_TONE[availability.status]} variant="soft">{AVAIL_LABEL[availability.status]}</Badge>;
}
