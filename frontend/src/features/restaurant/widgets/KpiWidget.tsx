import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { StatCard, type IconName } from '@/design-system';
import { cn } from '@/lib/cn';

type StatDelta = { value: number; direction?: 'up' | 'down'; label?: string };

/**
 * KpiWidget — the reusable KPI tile. Wraps the design-system StatCard and adds a
 * brief highlight pulse whenever the value changes (realtime feedback). Purely
 * presentational: pass backend-computed values. Reusable by the Admin dashboard.
 */
export function KpiWidget({
  label,
  value,
  icon,
  delta,
  positiveIsGood = true,
  hint,
  loading,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  delta?: StatDelta;
  positiveIsGood?: boolean;
  hint?: ReactNode;
  loading?: boolean;
  className?: string;
}) {
  const [pulse, setPulse] = useState(false);
  const prev = useRef<ReactNode>(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 900);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div className={cn('rounded-xl transition-shadow', pulse && 'ring-2 ring-primary/40 motion-reduce:ring-0', className)}>
      <StatCard label={label} value={value} icon={icon} delta={delta} positiveIsGood={positiveIsGood} hint={hint} loading={loading} />
    </div>
  );
}
