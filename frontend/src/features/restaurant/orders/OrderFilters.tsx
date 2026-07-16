import { Button, Icon, Input } from '@/design-system';
import { FilterChip } from '@/features/discovery';
import { modals } from '@/platform/overlays';
import { ORDER_BUCKETS, type OrderStatus, type PaymentStatus } from '../types';
import type { OrderFilters as Filters } from '../services';
import { savedViews, useSavedViews } from './saved-views';

const PAYMENT_FILTERS: { key: PaymentStatus; label: string }[] = [
  { key: 'captured', label: 'Paid' },
  { key: 'pending', label: 'Unpaid' },
  { key: 'failed', label: 'Failed' },
];

/**
 * OrderFilters — a chip-based filter bar (buckets + payment) with search and saved
 * views. Reuses the Discovery Platform's FilterChip. New filters plug in as chips
 * without redesign; presets persist via the saved-views store.
 */
export function OrderFilters({
  filters,
  patch,
  reset,
}: {
  filters: Filters;
  patch: (p: Partial<Filters>) => void;
  reset: () => void;
}) {
  const views = useSavedViews();

  const activeBucket = (statuses: OrderStatus[]) =>
    Boolean(filters.status?.length) && statuses.every((s) => filters.status!.includes(s)) && filters.status!.length === statuses.length;

  const togglePayment = (p: PaymentStatus) => {
    const set = new Set(filters.paymentStatus ?? []);
    set.has(p) ? set.delete(p) : set.add(p);
    patch({ paymentStatus: set.size ? [...set] : undefined });
  };

  const saveView = () => {
    modals.open({
      title: 'Save view',
      size: 'sm',
      content: (close) => <SaveViewForm onSave={(name) => { savedViews.add(name, filters); close(); }} onCancel={close} />,
    });
  };

  const hasActive = filters.status?.length || filters.paymentStatus?.length || filters.q;

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
        <Input
          type="search"
          value={filters.q ?? ''}
          onChange={(e) => patch({ q: e.target.value || undefined })}
          placeholder="Search order #, customer, table…"
          className="pl-9"
        />
      </div>

      {/* Bucket chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip active={!filters.status?.length} onClick={() => patch({ status: undefined })}>All</FilterChip>
        {ORDER_BUCKETS.map((b) => (
          <FilterChip key={b.key} active={activeBucket(b.statuses)} onClick={() => patch({ status: b.statuses })}>
            {b.label}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        {PAYMENT_FILTERS.map((p) => (
          <FilterChip key={p.key} active={filters.paymentStatus?.includes(p.key)} icon="payment" onClick={() => togglePayment(p.key)}>
            {p.label}
          </FilterChip>
        ))}
      </div>

      {/* Saved views */}
      <div className="flex flex-wrap items-center gap-2">
        {views.map((v) => (
          <FilterChip key={v.id} onClick={() => patch({ ...v.filters })}>
            {v.name}
          </FilterChip>
        ))}
        <Button variant="ghost" size="sm" leftIcon="add" onClick={saveView}>Save view</Button>
        {hasActive && <Button variant="ghost" size="sm" leftIcon="close" onClick={reset}>Clear</Button>}
      </div>
    </div>
  );
}

function SaveViewForm({ onSave, onCancel }: { onSave: (name: string) => void; onCancel: () => void }) {
  let value = '';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave(value.trim());
      }}
      className="space-y-3"
    >
      <Input autoFocus placeholder="View name" onChange={(e) => (value = e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
