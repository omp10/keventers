import { Badge } from '@/design-system';
import type { Availability, CatalogStatus } from '../types';

const STATUS_TONE: Record<CatalogStatus, 'success' | 'neutral' | 'info' | 'warning'> = {
  published: 'success',
  draft: 'neutral',
  scheduled: 'info',
  archived: 'warning',
};
const STATUS_LABEL: Record<CatalogStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  scheduled: 'Scheduled',
  archived: 'Archived',
};

/** Catalog lifecycle badge (backend-owned state; theme-driven). */
export function StatusBadge({ status }: { status: CatalogStatus }) {
  return <Badge tone={STATUS_TONE[status]} variant="soft">{STATUS_LABEL[status]}</Badge>;
}

const AVAIL_TONE = { available: 'success', unavailable: 'danger', scheduled: 'info' } as const;
const AVAIL_LABEL = { available: 'Available', unavailable: 'Unavailable', scheduled: 'Scheduled' } as const;

/** Availability badge — reflects backend availability state only. */
export function AvailabilityBadge({ availability }: { availability?: Availability }) {
  if (!availability) return null;
  return <Badge tone={AVAIL_TONE[availability.state]} variant="soft">{AVAIL_LABEL[availability.state]}</Badge>;
}
