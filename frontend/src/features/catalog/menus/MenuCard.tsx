import { Badge, Button, Card, Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger, Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import { StatusBadge } from '../components';
import type { Menu } from '../types';

export type MenuAction = 'setActive' | 'publish' | 'schedule' | 'duplicate' | 'archive';

const fmtDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Premium menu card — lifecycle, active state, counts, and a per-menu action menu. */
export function MenuCard({ menu, onAction }: { menu: Menu; onAction: (action: MenuAction) => void }) {
  const updated = fmtDate(menu.updatedAt);
  return (
    <Card
      padding="lg"
      interactive
      className={cn(
        'group relative flex flex-col gap-4 overflow-hidden transition',
        menu.active && 'ring-1 ring-primary/40',
      )}
    >
      {menu.active && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Icon name="utensils" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{menu.name}</h3>
            {menu.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-foreground-muted">{menu.description}</p>
            )}
          </div>
        </div>

        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${menu.name}`}>
              <Icon name="more" />
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end">
            <DropdownItem icon="check" onSelect={() => onAction('setActive')}>Set active</DropdownItem>
            <DropdownItem icon="checkCircle" onSelect={() => onAction('publish')}>Publish</DropdownItem>
            <DropdownItem icon="calendar" onSelect={() => onAction('schedule')}>Schedule</DropdownItem>
            <DropdownItem icon="copy" onSelect={() => onAction('duplicate')}>Duplicate</DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon="delete" destructive onSelect={() => onAction('archive')}>Archive</DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={menu.status} />
        {menu.active && <Badge tone="success" variant="solid">Active</Badge>}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-sm text-foreground-muted">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="grid" size="sm" className="text-foreground-subtle" />
            {menu.categoryCount ?? 0} categories
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="package" size="sm" className="text-foreground-subtle" />
            {menu.productCount ?? 0} items
          </span>
        </div>
        {updated && (
          <span className="inline-flex items-center gap-1 text-xs text-foreground-subtle">
            <Icon name="clock" size="sm" /> {updated}
          </span>
        )}
      </div>
    </Card>
  );
}
