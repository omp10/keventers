import { Button, Icon, Input } from '@/design-system';
import { FilterChip } from '@/features/discovery';
import { modals } from '@/platform/overlays';
import type { AvailabilityState, CatalogStatus, Category, ProductFilters, VegClass } from '../types';
import { savedViews, useSavedViews } from './saved-views';

// Keys ARE the API's enum values — they go straight into the ?status= query, so
// filtering on 'published'/'scheduled' could never match anything it returns.
const STATUSES: { key: CatalogStatus; label: string }[] = [
  { key: 'active', label: 'Live' },
  { key: 'draft', label: 'Draft' },
  { key: 'inactive', label: 'Hidden' },
  { key: 'archived', label: 'Archived' },
];
const AVAIL: { key: AvailabilityState; label: string }[] = [
  { key: 'available', label: 'Available' },
  { key: 'out_of_stock', label: 'Out of stock' },
  { key: 'temporarily_disabled', label: 'Paused' },
];
const VEG: { key: VegClass; label: string }[] = [
  { key: 'veg', label: 'Veg' },
  { key: 'non_veg', label: 'Non-veg' },
];

/**
 * CatalogFilters — chip-based product filter bar (status/availability/veg/featured/
 * popular) + category picker + search + saved views. Reuses the Discovery
 * Platform's FilterChip. New filters plug in as chips — no redesign.
 */
export function CatalogFilters({
  filters,
  patch,
  reset,
  categories,
}: {
  filters: ProductFilters;
  patch: (p: Partial<ProductFilters>) => void;
  reset: () => void;
  categories?: Category[];
}) {
  const views = useSavedViews<ProductFilters>('products');

  const toggleArr = <K extends 'status' | 'availability' | 'veg'>(key: K, val: NonNullable<ProductFilters[K]>[number]) => {
    const set = new Set((filters[key] as unknown[]) ?? []);
    set.has(val) ? set.delete(val) : set.add(val);
    patch({ [key]: set.size ? [...set] : undefined } as Partial<ProductFilters>);
  };

  const saveView = () =>
    modals.open({
      title: 'Save view',
      size: 'sm',
      content: (close) => <SaveForm onSave={(name) => { savedViews.add('products', name, filters); close(); }} onCancel={close} />,
    });

  const hasActive = filters.status?.length || filters.availability?.length || filters.veg?.length || filters.featured || filters.popular || filters.q || filters.categoryId;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input type="search" value={filters.q ?? ''} onChange={(e) => patch({ q: e.target.value || undefined })} placeholder="Search products…" className="pl-9" />
        </div>
        {categories && categories.length > 0 && (
          <select
            value={filters.categoryId ?? ''}
            onChange={(e) => patch({ categoryId: e.target.value || undefined })}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUSES.map((s) => (
          <FilterChip key={s.key} active={filters.status?.includes(s.key)} onClick={() => toggleArr('status', s.key)}>{s.label}</FilterChip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        {AVAIL.map((a) => (
          <FilterChip key={a.key} active={filters.availability?.includes(a.key)} onClick={() => toggleArr('availability', a.key)}>{a.label}</FilterChip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        {VEG.map((v) => (
          <FilterChip key={v.key} active={filters.veg?.includes(v.key)} onClick={() => toggleArr('veg', v.key)}>{v.label}</FilterChip>
        ))}
        <FilterChip active={filters.featured} icon="star" onClick={() => patch({ featured: !filters.featured || undefined })}>Featured</FilterChip>
        <FilterChip active={filters.popular} icon="trend" onClick={() => patch({ popular: !filters.popular || undefined })}>Popular</FilterChip>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {views.map((v) => (
          <FilterChip key={v.id} onClick={() => patch({ ...v.filters })}>{v.name}</FilterChip>
        ))}
        <Button variant="ghost" size="sm" leftIcon="add" onClick={saveView}>Save view</Button>
        {hasActive && <Button variant="ghost" size="sm" leftIcon="close" onClick={reset}>Clear</Button>}
      </div>
    </div>
  );
}

function SaveForm({ onSave, onCancel }: { onSave: (name: string) => void; onCancel: () => void }) {
  let value = '';
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSave(value.trim()); }} className="space-y-3">
      <Input autoFocus placeholder="View name" onChange={(e) => (value = e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
