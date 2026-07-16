import { cn } from '@/lib/cn';
import { VEG_PRESENTATION } from '../format';
import type { VegClass } from '../types';

/** The classic veg / non-veg / egg square indicator. Theme-token colored. */
export function VegMark({ veg, className }: { veg?: VegClass; className?: string }) {
  if (!veg) return null;
  const p = VEG_PRESENTATION[veg];
  return (
    <span
      role="img"
      aria-label={p.label}
      title={p.label}
      className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border-2', p.color, className)}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', veg === 'non_veg' ? 'bg-danger' : veg === 'egg' ? 'bg-warning' : 'bg-success')} />
    </span>
  );
}
