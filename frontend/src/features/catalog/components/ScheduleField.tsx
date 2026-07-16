import { Input } from '@/design-system';
import type { Schedule } from '../types';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Date/time + weekday schedule editor. Emits a Schedule the backend interprets. */
export function ScheduleField({ value, onChange }: { value?: Schedule | null; onChange: (s: Schedule) => void }) {
  const s = value ?? {};
  const set = (patch: Partial<Schedule>) => onChange({ ...s, ...patch });
  const toggleDay = (d: number) => {
    const days = new Set(s.days ?? []);
    days.has(d) ? days.delete(d) : days.add(d);
    set({ days: [...days].sort() });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-foreground-muted">
          Starts
          <Input type="datetime-local" value={s.startAt?.slice(0, 16) ?? ''} onChange={(e) => set({ startAt: e.target.value || null })} className="mt-1" />
        </label>
        <label className="text-xs text-foreground-muted">
          Ends
          <Input type="datetime-local" value={s.endAt?.slice(0, 16) ?? ''} onChange={(e) => set({ endAt: e.target.value || null })} className="mt-1" />
        </label>
      </div>
      <div>
        <p className="mb-1 text-xs text-foreground-muted">Days</p>
        <div className="flex gap-1">
          {DAYS.map((label, d) => (
            <button
              key={d}
              type="button"
              aria-pressed={s.days?.includes(d)}
              onClick={() => toggleDay(d)}
              className={`h-8 w-8 rounded-md text-xs font-medium transition ${s.days?.includes(d) ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-foreground-muted">
          From
          <Input type="time" value={s.from ?? ''} onChange={(e) => set({ from: e.target.value })} className="mt-1" />
        </label>
        <label className="text-xs text-foreground-muted">
          To
          <Input type="time" value={s.to ?? ''} onChange={(e) => set({ to: e.target.value })} className="mt-1" />
        </label>
      </div>
    </div>
  );
}
