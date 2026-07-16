import * as ProgressPrimitive from '@radix-ui/react-progress';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

const TONE = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info' };

export type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  value?: number | null;
  tone?: keyof typeof TONE;
  size?: 'sm' | 'md' | 'lg';
  /** null value → indeterminate loading bar. */
  indeterminate?: boolean;
};

/** Progress — linear bar (determinate + indeterminate), Radix a11y, token tones. */
export const Progress = forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  function Progress({ className, value = 0, tone = 'primary', size = 'md', indeterminate, ...props }, ref) {
    const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={indeterminate ? null : value}
        className={cn('relative w-full overflow-hidden rounded-pill bg-muted', h, className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full rounded-pill transition-transform duration-500 ease-standard',
            TONE[tone],
            indeterminate && 'w-1/3 animate-[kv-progress-indeterminate_1.2s_ease-in-out_infinite]',
          )}
          style={indeterminate ? undefined : { transform: `translateX(-${100 - Math.min(100, Math.max(0, value ?? 0))}%)` }}
        />
      </ProgressPrimitive.Root>
    );
  },
);

export type CircularProgressProps = {
  value?: number;
  size?: number;
  strokeWidth?: number;
  tone?: keyof typeof TONE;
  indeterminate?: boolean;
  className?: string;
  showValue?: boolean;
};

const STROKE = { primary: 'stroke-primary', success: 'stroke-success', warning: 'stroke-warning', danger: 'stroke-danger', info: 'stroke-info' };

/** CircularProgress — ring gauge (determinate + indeterminate spinner). */
export function CircularProgress({ value = 0, size = 44, strokeWidth = 4, tone = 'primary', indeterminate, showValue, className }: CircularProgressProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = c - (pct / 100) * c;
  return (
    <div className={cn('relative inline-grid place-items-center', className)} role="progressbar" aria-valuenow={indeterminate ? undefined : pct} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} className={cn(indeterminate && 'animate-[kv-spin_0.9s_linear_infinite]')}>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} className="stroke-muted" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={cn(STROKE[tone], 'transition-[stroke-dashoffset] duration-500 ease-standard')}
          strokeDasharray={c}
          strokeDashoffset={indeterminate ? c * 0.7 : offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showValue && !indeterminate && <span className="absolute text-xs font-semibold tabular-nums">{Math.round(pct)}%</span>}
    </div>
  );
}
