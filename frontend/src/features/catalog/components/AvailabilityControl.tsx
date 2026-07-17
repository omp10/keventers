import { Badge, Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import type { Availability, AvailabilityState } from '../types';
import { ScheduleField } from './ScheduleField';

// The API's own three states. It distinguishes WHY an item is off — sold out vs
// deliberately paused — which is exactly what a kitchen needs to tell apart, so
// don't collapse them back into one "unavailable".
const STATES: { key: AvailabilityState; label: string; tone: string }[] = [
  { key: 'available', label: 'Available', tone: 'data-[on=true]:bg-success data-[on=true]:text-success-foreground' },
  { key: 'out_of_stock', label: 'Out of stock', tone: 'data-[on=true]:bg-danger data-[on=true]:text-danger-foreground' },
  { key: 'temporarily_disabled', label: 'Paused', tone: 'data-[on=true]:bg-warning data-[on=true]:text-warning-foreground' },
];

const OVERRIDE_TONE: Record<AvailabilityState, 'success' | 'danger' | 'warning'> = {
  available: 'success',
  out_of_stock: 'danger',
  temporarily_disabled: 'warning',
};

/**
 * AvailabilityControl — edits an item's availability and its schedule. Branch
 * overrides are shown read-only (managed per branch). The backend resolves
 * EFFECTIVE availability; the UI only expresses intent.
 */
export function AvailabilityControl({ value, onChange }: { value: Availability; onChange: (a: Availability) => void }) {
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {STATES.map((s) => (
          <button
            key={s.key}
            type="button"
            data-on={value.status === s.key}
            onClick={() => onChange({ ...value, status: s.key })}
            className={cn('rounded-md px-3 py-1.5 text-sm font-medium text-foreground-muted transition', s.tone)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {value.scheduled && (
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
              <Badge key={o.branchId} tone={OVERRIDE_TONE[o.status] ?? 'info'} variant="soft">
                {o.branchName ?? o.branchId}: {o.status.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
