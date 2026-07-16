import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/**
 * Table — a styled, accessible primitive set (semantic <table> markup) with
 * sticky header support, hover rows and consistent cell rhythm. For large virtual
 * datasets use <DataGrid> which builds on these styles.
 */
export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(function Table({ className, ...props }, ref) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table ref={ref} className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
    </div>
  );
});

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />;
});

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
});

export const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(function TableFooter({ className, ...props }, ref) {
  return <tfoot ref={ref} className={cn('border-t border-border bg-muted/40 font-medium', className)} {...props} />;
});

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(function TableRow({ className, ...props }, ref) {
  return <tr ref={ref} className={cn('border-b border-border transition-colors hover:bg-[var(--kv-hover)] data-[state=selected]:bg-primary-soft', className)} {...props} />;
});

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement> & { sticky?: boolean }>(function TableHead({ className, sticky, ...props }, ref) {
  return (
    <th
      ref={ref}
      className={cn(
        'h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-foreground-subtle whitespace-nowrap',
        sticky && 'sticky top-0 z-10 bg-surface/95 backdrop-blur',
        className,
      )}
      {...props}
    />
  );
});

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(function TableCell({ className, ...props }, ref) {
  return <td ref={ref} className={cn('px-4 py-3 align-middle', className)} {...props} />;
});

export const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(function TableCaption({ className, ...props }, ref) {
  return <caption ref={ref} className={cn('mt-3 text-sm text-foreground-muted', className)} {...props} />;
});
