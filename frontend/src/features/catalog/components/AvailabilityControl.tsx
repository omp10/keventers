import { Badge, Button, Icon, Input } from '@/design-system';
import { cn } from '@/lib/cn';
import type { Availability, AvailabilityState, AvailabilityWindow } from '../types';

// The API's own three states.
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

type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Ordered day names matching the backend enum exactly.
const DAY_LABELS: { key: DayName; short: string }[] = [
  { key: 'sunday', short: 'Su' },
  { key: 'monday', short: 'Mo' },
  { key: 'tuesday', short: 'Tu' },
  { key: 'wednesday', short: 'We' },
  { key: 'thursday', short: 'Th' },
  { key: 'friday', short: 'Fr' },
  { key: 'saturday', short: 'Sa' },
];

function blankWindow(): AvailabilityWindow {
  return { days: [], startTime: '', endTime: '' };
}

function WindowEditor({
  window: w,
  onChange,
  onRemove,
}: {
  window: AvailabilityWindow;
  onChange: (w: AvailabilityWindow) => void;
  onRemove: () => void;
}) {
  const toggleDay = (day: DayName) => {
    const days = new Set(w.days ?? []);
    days.has(day) ? days.delete(day) : days.add(day);
    onChange({ ...w, days: [...days] });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-raised p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground-muted">Time window</p>
        <Button variant="ghost" size="icon-sm" aria-label="Remove window" onClick={onRemove}>
          <Icon name="delete" />
        </Button>
      </div>

      {/* Day pickers */}
      <div>
        <p className="mb-1 text-xs text-foreground-muted">Days</p>
        <div className="flex gap-1 flex-wrap">
          {DAY_LABELS.map(({ key, short }) => (
            <button
              key={key}
              type="button"
              aria-pressed={w.days?.includes(key)}
              onClick={() => toggleDay(key)}
              className={cn(
                'h-8 w-8 rounded-md text-xs font-medium transition',
                w.days?.includes(key)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground-muted hover:text-foreground',
              )}
            >
              {short}
            </button>
          ))}
        </div>
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-foreground-muted">
          From
          <Input
            type="time"
            value={w.startTime ?? ''}
            onChange={(e) => onChange({ ...w, startTime: e.target.value || undefined })}
            className="mt-1"
          />
        </label>
        <label className="text-xs text-foreground-muted">
          To
          <Input
            type="time"
            value={w.endTime ?? ''}
            onChange={(e) => onChange({ ...w, endTime: e.target.value || undefined })}
            className="mt-1"
          />
        </label>
      </div>

      {/* Optional label */}
      <label className="text-xs text-foreground-muted">
        Label (optional)
        <Input
          value={w.label ?? ''}
          onChange={(e) => onChange({ ...w, label: e.target.value || undefined })}
          placeholder="e.g. Lunch hours"
          className="mt-1"
        />
      </label>
    </div>
  );
}

/**
 * AvailabilityControl — edits an item's availability status and its time windows.
 * Windows are stored as `availability.windows` (backend shape). Branch overrides
 * are shown read-only (managed per branch).
 */
export function AvailabilityControl({
  value,
  onChange,
}: {
  value: Availability;
  onChange: (a: Availability) => void;
}) {
  const windows = value.windows ?? [];

  const setWindows = (next: AvailabilityWindow[]) =>
    onChange({ ...value, windows: next, scheduled: next.length > 0 });

  const addWindow = () => setWindows([...windows, blankWindow()]);

  const updateWindow = (i: number, w: AvailabilityWindow) =>
    setWindows(windows.map((x, idx) => (idx === i ? w : x)));

  const removeWindow = (i: number) =>
    setWindows(windows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {/* Status toggle */}
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

      {/* Schedule windows */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Time windows</p>
            <p className="text-xs text-foreground-subtle">Restrict when this item is available each week.</p>
          </div>
          <Button variant="secondary" size="sm" leftIcon="add" onClick={addWindow}>
            Add window
          </Button>
        </div>

        {windows.length === 0 ? (
          <p className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground-subtle">
            No time restrictions — item follows the store hours.
          </p>
        ) : (
          windows.map((w, i) => (
            <WindowEditor
              key={i}
              window={w}
              onChange={(updated) => updateWindow(i, updated)}
              onRemove={() => removeWindow(i)}
            />
          ))
        )}
      </div>

      {/* Branch overrides (read-only) */}
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
