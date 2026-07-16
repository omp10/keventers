import { useMemo } from 'react';

import { cn } from '@/lib/cn';
import type { SeriesPoint } from '../../types';

/**
 * MiniAreaChart — a dependency-free, theme-driven area/line chart (no chart lib).
 * Colors come from the current theme via `currentColor` (set `colorClass`), so it's
 * white-label and dark-mode aware. Reusable by any dashboard (staff or admin).
 */
export function MiniAreaChart({
  data,
  height = 160,
  colorClass = 'text-primary',
  className,
}: {
  data: SeriesPoint[];
  height?: number;
  colorClass?: string;
  className?: string;
}) {
  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' };
    const W = 100;
    const H = 40;
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pad = 3;
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - pad - ((d.value - min) / span) * (H - pad * 2);
      return [x, y] as const;
    });
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const area = `${line} L${W} ${H} L0 ${H} Z`;
    return { line, area };
  }, [data]);

  if (data.length < 2) {
    return <div className={cn('grid place-items-center text-sm text-foreground-subtle', className)} style={{ height }}>Not enough data</div>;
  }

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" width="100%" height={height} className={cn(colorClass, className)} role="img" aria-label="Trend chart">
      <path d={area} className="fill-current opacity-10" />
      <path d={line} className="fill-none stroke-current" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
