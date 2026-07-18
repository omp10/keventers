import { useSearchParams } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Icon,
  Spinner,
} from '@/design-system';
import { cn } from '@/lib/cn';

import { useBulkSelection } from '../bulk';
import { StatusBadge } from '../components';
import { useModifierGroups } from '../hooks';
import type { ModifierGroupDraft } from '../types';
import { ModifierGroupEditor } from './ModifierGroupEditor';

/**
 * ModifiersPage — manage reusable modifier groups. List of cards with select +
 * bulk bar; editor opens as a right drawer keyed by ?group= / ?new=1 so it is
 * deep-linkable. All persistence flows through the modifier mutation hook.
 */
export function ModifiersPage() {
  const { data, isLoading } = useModifierGroups();
  const [params, setParams] = useSearchParams();
  const sel = useBulkSelection();

  const groups = data ?? [];
  const editingId = params.get('group');
  const isNew = params.get('new') === '1';
  const editing = editingId ? groups.find((g) => g.id === editingId) : undefined;

  const openNew = () => setParams((p) => { p.set('new', '1'); p.delete('group'); return p; });
  const openEdit = (id: string) => setParams((p) => { p.set('group', id); p.delete('new'); return p; });
  const closeEditor = () => setParams((p) => { p.delete('group'); p.delete('new'); return p; });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-28">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modifier groups</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">Reusable option sets shared across products.</p>
        </div>
        <Button variant="primary" leftIcon="add" onClick={openNew}>
          New group
        </Button>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Spinner />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Icon name="utensils" />}
          title="No modifier groups yet"
          description="Create a group like “Choose your base” or “Extra toppings” to reuse across products."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              selected={sel.isSelected(g.id)}
              onToggle={() => sel.toggle(g.id)}
              onEdit={() => openEdit(g.id)}
            />
          ))}
        </div>
      )}

      {/* No bulk bar: modifier-group duplicate/archive have no backend, so the
          old bar only ever fired "Coming soon" toasts. Removed rather than
          faked — edit a group via its card instead. */}

      {(isNew || editing) && (
        <ModifierGroupEditor
          key={editingId ?? 'new'}
          groupId={editing?.id}
          group={editing}
          isNew={isNew}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}

function GroupCard({
  group,
  selected,
  onToggle,
  onEdit,
}: {
  group: ModifierGroupDraft;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <Card
      padding="md"
      className={cn('flex flex-col gap-3 transition', selected && 'ring-2 ring-primary')}
    >
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${group.name}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{group.name || 'Untitled group'}</h3>
            <Badge tone={group.required ? 'primary' : 'neutral'} variant="soft">
              {group.required ? 'Required' : 'Optional'}
            </Badge>
            {group.status && <StatusBadge status={group.status} />}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="filter" className="h-3.5 w-3.5" />
              {group.min}–{group.max} choose
            </span>
            <span>{group.modifiers.length} option{group.modifiers.length === 1 ? '' : 's'}</span>
            {group.usageCount != null && (
              <span className="text-foreground-subtle">used by {group.usageCount} product{group.usageCount === 1 ? '' : 's'}</span>
            )}
          </div>
        </div>
        <Button size="xs" variant="ghost" leftIcon="edit" onClick={onEdit} aria-label="Edit group">
          Edit
        </Button>
      </div>
    </Card>
  );
}
