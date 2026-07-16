import { Badge, Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import type { Availability, AvailabilityState } from '../types';
import { ScheduleField } from './ScheduleField';

const STATES: { key: AvailabilityState; label: string; tone: string }[] = [
  { key: 'available', label: 'Available', tone: 'data-[on=true]:bg-success data-[on=true]:text-success-foreground' },
  { key: 'unavailable', label: 'Unavailable', tone: 'data-[on=true]:bg-danger data-[on=true]:text-danger-foreground' },
  { key: 'scheduled', label: 'Scheduled', tone: 'data-[on=true]:bg-info data-[on=true]:text-info-foreground' },
];

/**
 * AvailabilityControl — edits an item's availability (available / unavailable /
 * scheduled) and its schedule. Branch overrides are shown read-only (managed per
 * branch). The backend resolves EFFECTIVE availability; the UI only expresses intent.
 */
export function AvailabilityControl({ value, onChange }: { value: Availability; onChange: (a: Availability) => void }) {
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {STATES.map((s) => (
          <button
            key={s.key}
            type="button"
            data-on={value.state === s.key}
            onClick={() => onChange({ ...value, state: s.key })}
            className={cn('rounded-md px-3 py-1.5 text-sm font-medium text-foreground-muted transition', s.tone)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {value.state === 'scheduled' && (
        <div className="rounded-xl border border-border p-3">
          <ScheduleField value={value.schedule} onChange={(schedule) => onChange({ ...value, schedule })} />
        </div>
      )}

      {value.branchOverrides && value.branchOverrides.length > 0 && (
        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
            <Icon name="store" className="h-3.5 w-3.5" /> Branch overrides
          </p>
          <div className="flex flex-wrap gap-2">
            {value.branchOverrides.map((o) => (
              <Badge key={o.branchId} tone={o.state === 'available' ? 'success' : o.state === 'unavailable' ? 'danger' : 'info'} variant="soft">
                {o.branchName ?? o.branchId}: {o.state}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
