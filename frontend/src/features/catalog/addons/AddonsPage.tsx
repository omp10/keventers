import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  Icon,
  Spinner,
  Switch,
} from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { cn } from '@/lib/cn';

import { BulkActionBar, useBulkSelection } from '../bulk';
import { StatusBadge } from '../components';
import { useAddons, useModifierMutations } from '../hooks';
import type { AddonDraft } from '../types';
import { AddonEditor } from './AddonEditor';

const UNGROUPED = 'Ungrouped';

/**
 * AddonsPage — manage standalone add-ons, grouped by their optional `group`.
 * Inline availability toggling + a bulk bar for mark available/unavailable.
 * Editor opens as a right drawer keyed by ?addon= / ?new=1 (deep-linkable).
 */
export function AddonsPage() {
  const { data, isLoading } = useAddons();
  const [params, setParams] = useSearchParams();
  const mm = useModifierMutations();
  const sel = useBulkSelection();

  const addons = useMemo(() => data ?? [], [data]);
  const editingId = params.get('addon');
  const isNew = params.get('new') === '1';
  const editing = editingId ? addons.find((a) => a.id === editingId) : undefined;

  const grouped = useMemo(() => {
    const map = new Map<string, AddonDraft[]>();
    for (const a of addons) {
      const key = a.group?.trim() || UNGROUPED;
      (map.get(key) ?? map.set(key, []).get(key)!).push(a);
    }
    return [...map.entries()];
  }, [addons]);

  const openNew = () => setParams((p) => { p.set('new', '1'); p.delete('addon'); return p; });
  const openEdit = (id: string) => setParams((p) => { p.set('addon', id); p.delete('new'); return p; });
  const closeEditor = () => setParams((p) => { p.delete('addon'); p.delete('new'); return p; });

  const bulkSetAvailable = async (available: boolean) => {
    await Promise.all(sel.ids.map((id) => mm.updateAddon(id, { available })));
    sel.clear();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-28">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add-ons</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">Standalone extras guests can add to an order.</p>
        </div>
        <Button variant="primary" leftIcon="add" onClick={openNew}>
          New add-on
        </Button>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Spinner />
        </div>
      ) : addons.length === 0 ? (
        <EmptyState
          icon={<Icon name="utensils" />}
          title="No add-ons yet"
          description="Create extras like “Extra cheese” or “Chocolate drizzle” to offer with products."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([groupName, items]) => (
            <section key={groupName}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">{groupName}</h2>
              <Card padding="none" className="divide-y divide-border overflow-hidden">
                {items.map((a) => (
                  <AddonRow
                    key={a.id}
                    addon={a}
                    selected={sel.isSelected(a.id)}
                    onToggle={() => sel.toggle(a.id)}
                    onEdit={() => openEdit(a.id)}
                    onToggleAvailable={(available) => mm.updateAddon(a.id, { available })}
                  />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}

      <BulkActionBar
        count={sel.count}
        onClear={sel.clear}
        pending={mm.saving}
        actions={[
          { key: 'available', label: 'Mark available', icon: 'check', onClick: () => bulkSetAvailable(true) },
          { key: 'unavailable', label: 'Mark unavailable', icon: 'close', onClick: () => bulkSetAvailable(false) },
        ]}
      />

      {(isNew || editing) && (
        <AddonEditor
          key={editingId ?? 'new'}
          addonId={editing?.id}
          addon={editing}
          isNew={isNew}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}

function AddonRow({
  addon,
  selected,
  onToggle,
  onEdit,
  onToggleAvailable,
}: {
  addon: AddonDraft;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onToggleAvailable: (available: boolean) => void;
}) {
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2.5 transition', selected && 'bg-primary/5')}>
      <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${addon.name}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{addon.name || 'Untitled add-on'}</span>
          {addon.status && <StatusBadge status={addon.status} />}
        </div>
      </div>
      <span className="shrink-0 text-sm tabular-nums text-foreground-muted">{formatMoney(addon.price)}</span>
      <Switch
        checked={addon.available}
        onCheckedChange={onToggleAvailable}
        aria-label={`${addon.name} available`}
      />
      <Button size="xs" variant="ghost" leftIcon="edit" onClick={onEdit} aria-label="Edit add-on">
        Edit
      </Button>
    </div>
  );
}
