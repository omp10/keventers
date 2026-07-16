export { ManagementPage } from './ManagementPage';
export { ManagementTable, type Column, type TableSelection } from './ManagementTable';
export { StatusPill, EntityDrawer, ExportButton, type StatusTone } from './primitives';
export { ImageUploadField } from './ImageUploadField';

// Reuse existing infrastructure (no duplication):
export { useBulkSelection, BulkActionBar } from '@/features/catalog';
export { FilterChip } from '@/features/discovery';
