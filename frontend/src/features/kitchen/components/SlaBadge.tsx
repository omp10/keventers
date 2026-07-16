import { cn } from '@/lib/cn';
import type { KitchenSla } from '../types';
import { SLA_PRESENTATION } from './format';

/** SLA status pill — high-contrast, backend-state-driven. */
export function SlaBadge({ sla, className }: { sla: KitchenSla; className?: string }) {
  const p = SLA_PRESENTATION[sla.state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', p.bg, p.text, className)}>
      <span className={cn('h-2 w-2 rounded-full', p.dot, sla.state !== 'on_time' && 'animate-[kv-pulse_1.4s_ease-in-out_infinite] motion-reduce:animate-none')} />
      {p.label}
    </span>
  );
}
