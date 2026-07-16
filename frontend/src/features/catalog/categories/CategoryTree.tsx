import { useMemo, useState } from 'react';

import { Button, Checkbox, Icon, Input, Switch } from '@/design-system';
import { cn } from '@/lib/cn';
import { BulkActionBar, useBulkSelection } from '../bulk';
import { SortableList, StatusBadge, AvailabilityBadge } from '../components';
import { useCategoryMutations, useCategoryTree } from '../hooks';
import type { Category } from '../types';

type ViewMode = 'tree' | 'list';

/** Flatten nested categories into a depth-tagged list. */
function flatten(nodes: Category[], depth = 0, acc: { cat: Category; depth: number }[] = []) {
  for (const n of nodes) {
    acc.push({ cat: n, depth });
    if (n.children?.length) flatten(n.children, depth + 1, acc);
  }
  return acc;
}

/** Notion/Shopify-style category tree with reorder, search, bulk actions, and a list view. */
export function CategoryTree({ onEdit }: { onEdit: (category: Category) => void }) {
  const { data: tree = [] } = useCategoryTree();
  const cm = useCategoryMutations();
  const selection = useBulkSelection();

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('tree');

  const flat = useMemo(() => flatten(tree), [tree]);
  const q = query.trim().toLowerCase();
  const filtered = q ? flat.filter(({ cat }) => cat.name.toLowerCase().includes(q)) : flat;

  const toggleCollapse = (id: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const bulkActions = [
    { key: 'available', label: 'Available', icon: 'check' as const, onClick: () => void cm.bulk('available', selection.ids) },
    { key: 'unavailable', label: 'Unavailable', icon: 'close' as const, onClick: () => void cm.bulk('unavailable', selection.ids) },
    { key: 'archive', label: 'Archive', icon: 'delete' as const, tone: 'danger' as const, onClick: () => void cm.bulk('archive', selection.ids) },
  ];

  /** A single category row (shared by tree + flat views). */
  const Row = ({ cat, depth, showToggle }: { cat: Category; depth: number; showToggle: boolean }) => {
    const hasChildren = !!cat.children?.length;
    const isCollapsed = collapsed.has(cat.id);
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-transparent bg-surface px-2 py-2 transition',
          'hover:border-border hover:bg-muted/50',
          selection.isSelected(cat.id) && 'border-primary/40 bg-primary-soft/40',
        )}
        style={{ marginLeft: depth * 20 }}
      >
        <span className="grid h-6 w-5 shrink-0 place-items-center text-foreground-subtle" aria-hidden>
          <Icon name="chevronsUpDown" size="sm" className="cursor-grab" />
        </span>

        {showToggle && hasChildren ? (
          <button
            type="button"
            onClick={() => toggleCollapse(cat.id)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? `Expand ${cat.name}` : `Collapse ${cat.name}`}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-foreground-muted transition hover:bg-muted hover:text-foreground"
          >
            <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'} size="sm" />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" aria-hidden />
        )}

        <Checkbox checked={selection.isSelected(cat.id)} onCheckedChange={() => selection.toggle(cat.id)} aria-label={`Select ${cat.name}`} />

        {cat.icon && <span className="shrink-0 text-base leading-none">{cat.icon}</span>}

        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{cat.name}</span>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <StatusBadge status={cat.status} />
          <AvailabilityBadge availability={cat.availability} />
          <span className="inline-flex items-center gap-1 text-xs text-foreground-subtle">
            <Icon name="package" size="sm" /> {cat.productCount ?? 0}
          </span>
        </div>

        <Switch
          checked={cat.visible}
          onCheckedChange={(v) => void cm.setVisibility(cat.id, v)}
          aria-label={`Toggle visibility for ${cat.name}`}
        />

        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${cat.name}`} onClick={() => onEdit(cat)}>
          <Icon name="edit" />
        </Button>
      </div>
    );
  };

  /** Recursive sibling group with drag-reorder and animated expand/collapse. */
  const Siblings = ({ siblings, parentId, depth }: { siblings: Category[]; parentId: string | null; depth: number }) => (
    <SortableList
      items={siblings}
      getId={(c) => c.id}
      onReorder={(ids) => void cm.reorder(ids.map((id, i) => ({ id, parentId, order: i })))}
      renderItem={(cat) => {
        const hasChildren = !!cat.children?.length;
        const open = hasChildren && !collapsed.has(cat.id);
        return (
          <div>
            <Row cat={cat} depth={depth} showToggle />
            {hasChildren && (
              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                  open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden">
                  <div className="mt-1.5">
                    <Siblings siblings={cat.children!} parentId={cat.id} depth={depth + 1} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }}
    />
  );

  const flatMode = view === 'list' || q.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Icon name="search" size="sm" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories" className="pl-9" />
        </div>
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => setView('tree')}
            aria-pressed={view === 'tree'}
            className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition', view === 'tree' ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground')}
          >
            <Icon name="grid" size="sm" /> Tree
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
            className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground')}
          >
            <Icon name="menu" size="sm" /> List
          </button>
        </div>
      </div>

      {flatMode ? (
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-foreground-muted">No categories match “{query}”.</p>
          ) : (
            filtered.map(({ cat }) => <Row key={cat.id} cat={cat} depth={0} showToggle={false} />)
          )}
        </div>
      ) : (
        <Siblings siblings={tree} parentId={null} depth={0} />
      )}

      <BulkActionBar count={selection.count} actions={bulkActions} onClear={selection.clear} pending={cm.saving} />
    </div>
  );
}
