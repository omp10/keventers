import { Icon, type IconName } from '@/design-system';
import { cn } from '@/lib/cn';
import type { KitchenEntry } from '../types';

const STEPS: { key: keyof KitchenEntry['timers']; label: string; icon: IconName }[] = [
  { key: 'queuedAt', label: 'Received', icon: 'checkCircle' },
  { key: 'assignedAt', label: 'Assigned', icon: 'user' },
  { key: 'startedAt', label: 'Preparing', icon: 'flame' },
  { key: 'readyAt', label: 'Ready', icon: 'bag' },
  { key: 'servedAt', label: 'Served', icon: 'check' },
];

const time = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);

/**
 * KitchenTimeline — the order's kitchen journey (received → assigned → preparing →
 * ready → served) from backend timestamps. Updates in realtime as the entry does.
 */
export function KitchenTimeline({ entry }: { entry: KitchenEntry }) {
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2">
      {STEPS.map((s) => {
        const at = time(entry.timers[s.key]);
        const done = Boolean(at);
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span className={cn('grid h-7 w-7 place-items-center rounded-full', done ? 'bg-success text-success-foreground' : 'bg-muted text-foreground-subtle')}>
              <Icon name={s.icon} className="h-4 w-4" />
            </span>
            <span>
              <span className={cn('block text-sm font-medium', done ? 'text-foreground' : 'text-foreground-subtle')}>{s.label}</span>
              {at && <span className="block text-xs text-foreground-muted">{at}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
