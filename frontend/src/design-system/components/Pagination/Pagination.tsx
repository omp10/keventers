import { cn } from '@/lib/cn';
import { Button } from '@/design-system/components/Button';

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** How many numbered buttons to show around the current page. */
  siblingCount?: number;
  className?: string;
};

/** Build a page list with ellipses: 1 … 4 5 [6] 7 8 … 20 */
function range(page: number, pageCount: number, sib: number): (number | 'dots')[] {
  const total = sib * 2 + 5;
  if (pageCount <= total) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const left = Math.max(page - sib, 1);
  const right = Math.min(page + sib, pageCount);
  const showLeftDots = left > 2;
  const showRightDots = right < pageCount - 1;
  const out: (number | 'dots')[] = [1];
  if (showLeftDots) out.push('dots');
  for (let i = showLeftDots ? left : 2; i <= (showRightDots ? right : pageCount - 1); i++) out.push(i);
  if (showRightDots) out.push('dots');
  out.push(pageCount);
  return out;
}

/** Pagination — accessible page navigation with ellipsis truncation. */
export function Pagination({ page, pageCount, onPageChange, siblingCount = 1, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = range(page, pageCount, siblingCount);
  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Pagination">
      <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} leftIcon="chevronLeft" />
      {pages.map((p, i) =>
        p === 'dots' ? (
          <span key={`d${i}`} className="grid size-8 place-items-center text-sm text-foreground-subtle">…</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'primary' : 'ghost'}
            size="icon-sm"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className="tabular-nums"
          >
            {p}
          </Button>
        ),
      )}
      <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} leftIcon="chevronRight" />
    </nav>
  );
}
