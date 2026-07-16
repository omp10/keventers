import type { ReactNode } from 'react';

import { Checkbox, Spinner, EmptyState, Icon, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system';
import { cn } from '@/lib/cn';

export type Column<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
};

export type TableSelection = {
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  allSelected: (ids: string[]) => boolean;
};

/**
 * ManagementTable — the reusable directory table for staff / customers / coupons /
 * payments. Column config + optional multi-select + row click. Horizontal scroll for
 * tablets; loading/empty states built in. (Virtualized-ready: pass paged rows.)
 */
export function ManagementTable<T>({
  columns,
  rows,
  getId,
  onRowClick,
  selection,
  loading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon = 'users',
}: {
  columns: Column<T>[];
  rows: T[];
  getId: (row: T) => string;
  onRowClick?: (row: T) => void;
  selection?: TableSelection;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: Parameters<typeof Icon>[0]['name'];
}) {
  if (loading && rows.length === 0) {
    return <div className="grid h-40 place-items-center"><Spinner /></div>;
  }
  if (!loading && rows.length === 0) {
    return <EmptyState icon={<Icon name={emptyIcon} className="mb-3 h-8 w-8 text-muted-foreground" />} title={emptyTitle} description={emptyDescription} size="sm" />;
  }

  const ids = rows.map(getId);
  const allSelected = selection?.allSelected(ids) ?? false;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {selection && (
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={(v) => (v ? selection.selectAll(ids) : selection.clear())} aria-label="Select all" />
              </TableHead>
            )}
            {columns.map((c) => (
              <TableHead key={c.key} className={cn(c.align === 'right' && 'text-right', c.className)}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const id = getId(row);
            return (
              <TableRow key={id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn(onRowClick && 'cursor-pointer')}>
                {selection && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selection.isSelected(id)} onCheckedChange={() => selection.toggle(id)} aria-label="Select row" />
                  </TableCell>
                )}
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn(c.align === 'right' && 'text-right', c.className)}>{c.render(row)}</TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
