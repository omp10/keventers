import { cn } from '@/lib/cn';

/**
 * MiniBarChart — a dependency-free, theme-driven bar chart. Highlights the peak
 * bar. Colors via `currentColor` (theme). Reusable across dashboards.
 */
export function MiniBarChart({
  data,
  height = 160,
  colorClass = 'text-primary',
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  colorClass?: string;
  className?: string;
}) {
  if (data.length === 0) {
    return <div className={cn('grid place-items-center text-sm text-foreground-subtle', className)} style={{ height }}>No data</div>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('flex items-end gap-1', colorClass, className)} style={{ height }} role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const isPeak = d.value === max && d.value > 0;
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${d.value}`}>
            <div
              className={cn('w-full rounded-t transition-[height] duration-500 motion-reduce:transition-none', isPeak ? 'bg-current' : 'bg-current/35')}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
            <span className="text-[0.5rem] text-foreground-subtle">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
