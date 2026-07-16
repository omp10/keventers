import { cn } from '@/lib/cn';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /** 'shimmer' sweeps a gradient; 'pulse' fades opacity. */
  animation?: 'shimmer' | 'pulse' | 'none';
  variant?: 'rect' | 'circle' | 'text';
};

/**
 * Skeleton — content-shaped loading placeholder. Shimmer uses the brand-tinted
 * gradient token so loading states feel on-brand, not gray. Compose several to
 * mirror real content (see SkeletonText).
 */
export function Skeleton({ className, animation = 'shimmer', variant = 'rect', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'bg-muted',
        variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-md h-[0.85em]' : 'rounded-lg',
        animation === 'pulse' && 'animate-[kv-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]',
        animation === 'shimmer' &&
          'relative overflow-hidden bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--kv-color-foreground)_8%,transparent),transparent)] bg-[length:200%_100%] animate-[kv-shimmer_1.6s_linear_infinite]',
        className,
      )}
      {...props}
    />
  );
}

/** SkeletonText — N lines with a natural last-line width. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" className={cn('h-3.5', i === lines - 1 && 'w-3/5')} />
      ))}
    </div>
  );
}
