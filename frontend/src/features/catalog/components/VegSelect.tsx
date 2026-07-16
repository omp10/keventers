import { cn } from '@/lib/cn';
import type { VegClass } from '../types';

const OPTIONS: { key: VegClass; label: string; dot: string; ring: string }[] = [
  { key: 'veg', label: 'Veg', dot: 'bg-success', ring: 'border-success' },
  { key: 'non_veg', label: 'Non-veg', dot: 'bg-danger', ring: 'border-danger' },
  { key: 'egg', label: 'Egg', dot: 'bg-warning', ring: 'border-warning' },
];

/** Veg / Non-veg / Egg selector (segmented). Emits the class or undefined. */
export function VegSelect({ value, onChange }: { value?: VegClass; onChange: (v?: VegClass) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(value === o.key ? undefined : o.key)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
            value === o.key ? 'bg-muted text-foreground' : 'text-foreground-muted hover:text-foreground',
          )}
        >
          <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-[3px] border-2', o.ring)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', o.dot)} />
          </span>
          {o.label}
        </button>
      ))}
    </div>
  );
}
